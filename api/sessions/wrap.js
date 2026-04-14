// api/sessions/wrap.js
// POST /api/sessions/wrap
// The core action: mark session done, create Stripe payment link, save invoice, send parent email

import { getAuth } from '@clerk/express'
import { keys, setJson, getJson, addToIndex } from '../../src/lib/redis.js'
import { sendSessionSummary } from '../../src/lib/email.js'
import { generateId } from '../../src/lib/utils.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const {
    sessionId,
    topicsCovered = [],
    needsMoreWork = [],
    homeworkSet = [],
    notesForParent = '',
    privateTutorNotes = '',
    sendEmailNow = true,
  } = req.body

  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  // Load session
  const session = await getJson(keys.session(sessionId))
  if (!session) return res.status(404).json({ error: 'Session not found' })
  if (session.tutorId !== userId) return res.status(403).json({ error: 'Forbidden' })

  // Load student
  const student = await getJson(keys.student(session.studentId))
  if (!student) return res.status(404).json({ error: 'Student not found' })

  // Load settings for tutor branding
  const settings = await getJson(keys.settings(userId)) || {}
  const tutorName = settings.tutorName || 'Your tutor'
  const appName = settings.appName || 'KnowledgeHive'

  const now = new Date().toISOString()

  // ── 1. Create Stripe Payment Link ─────────────────────────────────────────
  let stripePaymentLinkUrl = null
  let stripePaymentLinkId = null

  try {
    const amountCents = student.ratePerSession
    const productName = `${student.subject} tutoring · ${student.sessionDurationMins} min`
    const customerEmail = student.billTo === 'student' ? student.email : student.parentEmail

    // Create a Stripe payment link via API
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'line_items[0][price_data][currency]': 'aud',
        'line_items[0][price_data][product_data][name]': productName,
        'line_items[0][price_data][unit_amount]': amountCents,
        'line_items[0][quantity]': '1',
        'metadata[session_id]': sessionId,
        'metadata[student_id]': session.studentId,
        'metadata[tutor_id]': userId,
        'after_completion[type]': 'hosted_confirmation',
        'after_completion[hosted_confirmation][custom_message]':
          `Thank you for paying! We'll see ${student.firstName} at the next session.`,
      }).toString(),
    })

    if (stripeRes.ok) {
      const stripeData = await stripeRes.json()
      stripePaymentLinkUrl = stripeData.url
      stripePaymentLinkId = stripeData.id
    } else {
      const errText = await stripeRes.text()
      console.error('Stripe payment link error:', errText)
      // Fall back to PayID if Stripe fails
      stripePaymentLinkUrl = `https://pay.knowledgehive.com.au?ref=${sessionId}`
    }
  } catch (err) {
    console.error('Stripe error:', err)
    stripePaymentLinkUrl = `https://pay.knowledgehive.com.au?ref=${sessionId}`
  }

  // ── 2. Update session record ───────────────────────────────────────────────
  const updatedSession = {
    ...session,
    status: 'completed',
    topicsCovered,
    needsMoreWork,
    homeworkSet,
    notesForParent,
    privateTutorNotes,
    completedAt: now,
    stripePaymentLinkUrl,
    stripePaymentLinkId,
  }
  await setJson(keys.session(sessionId), updatedSession)

  // ── 3. Create invoice record ───────────────────────────────────────────────
  const invoiceId = generateId('inv')
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // +7 days

  const invoice = {
    id: invoiceId,
    createdAt: now,
    tutorId: userId,
    studentId: session.studentId,
    studentName: session.studentName,
    sessionIds: [sessionId],
    amountAud: student.ratePerSession,
    status: 'pending',
    dueDate,
    stripePaymentLinkId,
    stripePaymentLinkUrl,
    summaryEmailSentAt: null,
    reminderSentAt: null,
    companyId: student.companyId || null,
  }

  await setJson(keys.invoice(invoiceId), invoice)
  await addToIndex(keys.tutorInvoices(userId), invoiceId)

  // Link invoice to session
  await setJson(keys.session(sessionId), { ...updatedSession, invoiceId })

  // ── 4. Update student stats ────────────────────────────────────────────────
  const updatedStudent = {
    ...student,
    totalSessions: (student.totalSessions || 0) + 1,
    lastSessionDate: now,
  }
  await setJson(keys.student(session.studentId), updatedStudent)

  // ── 5. Send parent email (non-blocking) ───────────────────────────────────
  let emailSent = false
  if (sendEmailNow && student.sendSummaryToParent) {
    try {
      await sendSessionSummary({
        student: updatedStudent,
        session: updatedSession,
        invoice,
        paymentUrl: stripePaymentLinkUrl,
        tutorName,
        appName,
      })
      emailSent = true

      // Record email sent time on invoice
      await setJson(keys.invoice(invoiceId), { ...invoice, summaryEmailSentAt: now })
    } catch (err) {
      console.error('Session summary email failed:', err)
    }
  }

  return res.status(200).json({
    session: { ...updatedSession, invoiceId },
    invoice,
    emailSent,
    paymentUrl: stripePaymentLinkUrl,
  })
}
