// api/sessions/wrap.js
import { Redis } from '@upstash/redis'

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

async function getUserId(req) {
  try {
    const { createClerkClient } = await import('@clerk/backend')
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return null
    const payload = await clerk.verifyToken(token)
    return payload?.sub || null
  } catch {
    return null
  }
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

    // Create Stripe payment link
    let paymentUrl = null
    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
      try {
        const stripeRes = await fetch('https://api.stripe.com/v1/payment_links', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'line_items[0][price_data][currency]': 'aud',
            'line_items[0][price_data][product_data][name]': `${student.subject} tutoring · ${student.sessionDurationMins} min`,
            'line_items[0][price_data][unit_amount]': student.ratePerSession,
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

    // Update session
    const updatedSession = {
      ...session, status: 'completed',
      topicsCovered, needsMoreWork, homeworkSet,
      notesForParent, privateTutorNotes, completedAt: now,
      stripePaymentLinkUrl: paymentUrl, paymentStatus: 'pending',
    }
    await redis.set(`kh:session:${sessionId}`, JSON.stringify(updatedSession))

    // Create invoice
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
      ...student, totalSessions: (student.totalSessions || 0) + 1, lastSessionDate: now,
    }))

    // Send parent email
    let emailSent = false
    if (sendEmailNow && student.sendSummaryToParent && process.env.RESEND_API_KEY && paymentUrl) {
      const amount = `$${(student.ratePerSession / 100).toFixed(2)}`
      const listItems = arr => arr.map(i => `<li>${i}</li>`).join('')
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@knowledgehive.com.au',
            to: [student.parentEmail, student.email].filter(Boolean),
            subject: `${student.firstName}'s session summary · ${student.subject}`,
            html: `
              <p>Hi ${student.parentName},</p>
              ${topicsCovered.length ? `<p><strong>Covered:</strong><ul>${listItems(topicsCovered)}</ul></p>` : ''}
              ${needsMoreWork.length ? `<p><strong>Focus next time:</strong><ul>${listItems(needsMoreWork)}</ul></p>` : ''}
              ${homeworkSet.length ? `<p><strong>Homework:</strong><ul>${listItems(homeworkSet)}</ul></p>` : ''}
              ${notesForParent ? `<p>${notesForParent}</p>` : ''}
              <div style="text-align:center;padding:20px;background:#ccfbf1;border-radius:8px;margin:20px 0">
                <div style="font-size:28px;font-weight:bold;color:#115e59">${amount}</div>
                <a href="${paymentUrl}" style="display:inline-block;margin-top:12px;background:#0d9488;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Pay Now via Stripe →</a>
              </div>
              <p>Warm regards,<br>KnowledgeHive</p>
            `,
          }),
        })
        emailSent = true
      } catch (e) { console.error('Email error:', e) }
    }

    return res.status(200).json({ session: updatedSession, invoice, emailSent, paymentUrl })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
