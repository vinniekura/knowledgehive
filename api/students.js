import { Redis } from '@upstash/redis'
import { getUserId } from './_auth.js'

function getRedis() {
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
}
function dollarsToCents(d) { return Math.round(parseFloat(d) * 100) }

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })
  const redis = getRedis()

  // GET — list students
  if (req.method === 'GET') {
    const ids = await redis.zrange(`kh:${userId}:students`, 0, -1, { rev: true })
    const students = ids.length ? await Promise.all(ids.map(id => redis.get(`kh:student:${id}`))) : []
    return res.json({ students: students.filter(Boolean) })
  }

  // POST — create student
  if (req.method === 'POST') {
    const body = req.body
    const { generateId } = await import('./utils.js').catch(() => ({ generateId: (p='') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}` }))
    const studentId = `stu_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`
    const now = new Date().toISOString()
    const student = {
      id: studentId, createdAt: now, tutorId: userId,
      firstName: body.firstName||'', lastName: body.lastName||'',
      email: body.email||'', status: 'active',
      parentName: body.parentName||'', parentEmail: body.parentEmail||'',
      parentMobile: body.parentMobile||'',
      source: body.source||'direct', companyName: body.companyName||'',
      subject: body.subject||'', yearLevel: body.yearLevel||'',
      sessionType: body.sessionType||'1on1_online',
      preferredDays: body.preferredDays||[], preferredTime: body.preferredTime||'',
      learningGoals: body.learningGoals||'',
      ratePerSession: dollarsToCents(body.ratePerSession||110),
      sessionDurationMins: parseInt(body.sessionDurationMins)||90,
      billTo: body.billTo||'parent',
      paymentMethod: body.paymentMethod||'stripe',
      autoReminder48h: body.autoReminder48h!==false,
      sendSummaryToParent: body.sendSummaryToParent!==false,
      totalSessions: 0, lastSessionDate: null,
    }
    await redis.set(`kh:student:${studentId}`, JSON.stringify(student))
    await redis.zadd(`kh:${userId}:students`, { score: Date.now(), member: studentId })

    if (body.sendWelcomeEmail !== false && process.env.RESEND_API_KEY) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL||'noreply@datamastery.com.au',
          to: [student.parentEmail, student.email].filter(e => e && e.includes('@')),
          subject: `Welcome to KnowledgeHive — ${student.firstName}'s tutoring`,
          html: `<p>Hi ${student.parentName},</p><p>${student.firstName} is now enrolled for <strong>${student.subject}</strong> tutoring. After each session you'll receive a summary and payment details.</p>`,
        }),
      }).catch(e => console.error('Welcome email error:', e))
    }
    return res.status(201).json({ student })
  }

  // PATCH — edit student (any field)
  if (req.method === 'PATCH') {
    const { studentId, ...updates } = req.body
    if (!studentId) return res.status(400).json({ error: 'studentId required' })
    const existing = await redis.get(`kh:student:${studentId}`)
    if (!existing) return res.status(404).json({ error: 'Student not found' })
    if (existing.tutorId !== userId) return res.status(403).json({ error: 'Forbidden' })

    // Convert rate to cents if provided
    if (updates.ratePerSession) updates.ratePerSession = dollarsToCents(updates.ratePerSession)
    if (updates.sessionDurationMins) updates.sessionDurationMins = parseInt(updates.sessionDurationMins)

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    await redis.set(`kh:student:${studentId}`, JSON.stringify(updated))
    return res.json({ student: updated })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
