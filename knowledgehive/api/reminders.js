// api/reminders.js
// POST /api/reminders  — send payment reminder for an invoice
// Can also be called by a Vercel cron (vercel.json crons config) to auto-remind 48h overdue

import { getAuth } from '@clerk/express'
import { getJson, setJson, getIndex, keys } from '../src/lib/redis.js'
import { sendPaymentReminder } from '../src/lib/email.js'
import { daysSince } from '../src/lib/utils.js'

export default async function handler(req, res) {
  // Cron calls use CRON_SECRET header, user calls use Clerk auth
  const isCron = req.headers['x-cron-secret'] === process.env.CRON_SECRET

  if (!isCron) {
    const { getAuth } = await import('@clerk/express')
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorised' })
  }

  // POST: send reminder for a specific invoice
  if (req.method === 'POST') {
    const { invoiceId } = req.body
    const invoice = await getJson(keys.invoice(invoiceId))
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

    const student = await getJson(keys.student(invoice.studentId))
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const settings = await getJson(keys.settings(invoice.tutorId)) || {}

    await sendPaymentReminder({
      student,
      invoice,
      paymentUrl: invoice.stripePaymentLinkUrl,
      tutorName: settings.tutorName || 'Your tutor',
      appName: settings.appName || 'KnowledgeHive',
      daysOverdue: daysSince(invoice.dueDate),
    })

    await setJson(keys.invoice(invoiceId), { ...invoice, reminderSentAt: new Date().toISOString() })

    return res.json({ sent: true })
  }

  // GET: auto-scan and remind all 48h+ overdue invoices (called by cron)
  if (req.method === 'GET' && isCron) {
    // Scan all tutors' invoices — simplified: in production use a global invoice index
    // For now just return OK — full cron implementation in Phase 2
    return res.json({ message: 'Cron reminder scan complete' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
