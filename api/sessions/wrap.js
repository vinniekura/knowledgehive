import { Redis } from '@upstash/redis'
import { getUserId } from '../_auth.js'

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

function generateId(prefix = '') {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return prefix ? `${prefix}_${ts}${rand}` : `${ts}${rand}`
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const redis = getRedis()
  const {
    sessionId, topicsCovered = [], needsMoreWork = [],
    homeworkSet = [], notesForParent = '', privateTutorNotes = '',
    sendEmailNow = true,
  } = req.body

  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  try {
    const session = await redis.get(`kh:session:${sessionId}`)
    if (!session) return res.status(404).json({ error: 'Session not found' })
    const student = await redis.get(`kh:student:${session.studentId}`)
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const now = new Date().toISOString()

    // Stripe payment link
    let paymentUrl = null
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (stripeKey && !stripeKey.includes('placeholder') && stripeKey.startsWith('sk_')) {
      try {
        const stripeRes = await fetch('https://api.stripe.com/v1/payment_links', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'line_items[0][price_data][currency]': 'aud',
            'line_items[0][price_data][product_data][name]': `${student.subject} tutoring · ${student.sessionDurationMins} min`,
            'line_items[0][price_data][unit_amount]': String(student.ratePerSession),
            'line_items[0][quantity]': '1',
            'metadata[session_id]': sessionId,
            'metadata[student_id]': session.studentId,
          }).toString(),
        })
        if (stripeRes.ok) {
          const sd = await stripeRes.json()
          paymentUrl = sd.url
        }
      } catch (e) { console.error('Stripe error:', e) }
    }

    const updatedSession = {
      ...session, status: 'completed',
      topicsCovered, needsMoreWork, homeworkSet,
      notesForParent, privateTutorNotes, completedAt: now,
      stripePaymentLinkUrl: paymentUrl, paymentStatus: 'pending',
    }
    await redis.set(`kh:session:${sessionId}`, JSON.stringify(updatedSession))

    // Invoice
    const invoiceId = generateId('inv')
    const invoice = {
      id: invoiceId, createdAt: now, tutorId: userId,
      studentId: session.studentId, studentName: session.studentName,
      sessionIds: [sessionId], amountAud: student.ratePerSession,
      status: 'pending', stripePaymentLinkUrl: paymentUrl,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    }
    await redis.set(`kh:invoice:${invoiceId}`, JSON.stringify(invoice))
    await redis.zadd(`kh:${userId}:invoices`, { score: Date.now(), member: invoiceId })

    // Update student stats
    await redis.set(`kh:student:${session.studentId}`, JSON.stringify({
      ...student,
      totalSessions: (student.totalSessions || 0) + 1,
      lastSessionDate: now,
    }))

    // Parent email
    let emailSent = false
    const resendKey = process.env.RESEND_API_KEY
    if (sendEmailNow && student.sendSummaryToParent && resendKey) {
      const amount = `$${(student.ratePerSession / 100).toFixed(2)}`
      const li = arr => arr.map(i => `<li>${i}</li>`).join('')
      const payBlock = paymentUrl
        ? `<div style="text-align:center;padding:20px;background:#ccfbf1;border-radius:8px;margin:20px 0">
            <div style="font-size:28px;font-weight:bold;color:#115e59">${amount}</div>
            <a href="${paymentUrl}" style="display:inline-block;margin-top:12px;background:#0d9488;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Pay Now via Stripe →</a>
           </div>`
        : `<p><strong>Session fee: ${amount}</strong> — your tutor will send a payment link shortly.</p>`

      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@knowledgehive.com.au',
            to: [student.parentEmail, student.email].filter(e => e && e.includes('@')),
            subject: `${student.firstName}'s session summary · ${student.subject}`,
            html: `
              <p>Hi ${student.parentName || 'there'},</p>
              <p>Great session with ${student.firstName} today!</p>
              ${topicsCovered.length ? `<p><strong>Covered:</strong><ul>${li(topicsCovered)}</ul></p>` : ''}
              ${needsMoreWork.length ? `<p><strong>Focus next time:</strong><ul>${li(needsMoreWork)}</ul></p>` : ''}
              ${homeworkSet.length ? `<p><strong>Homework:</strong><ul>${li(homeworkSet)}</ul></p>` : ''}
              ${notesForParent ? `<p>${notesForParent}</p>` : ''}
              ${payBlock}
              <p>Warm regards,<br>KnowledgeHive</p>
            `,
          }),
        })
        if (emailRes.ok) emailSent = true
        else console.error('Email send failed:', await emailRes.text())
      } catch (e) { console.error('Email error:', e) }
    }

    return res.status(200).json({ session: updatedSession, invoice, emailSent, paymentUrl })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
