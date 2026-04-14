import { Redis } from '@upstash/redis'
import { getUserId } from './_auth.js'

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

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const redis = getRedis()

  if (req.method === 'GET') {
    try {
      const ids = await redis.zrange(`kh:${userId}:students`, 0, -1, { rev: true })
      const students = ids.length
        ? await Promise.all(ids.map(id => redis.get(`kh:student:${id}`)))
        : []
      return res.status(200).json({ students: students.filter(Boolean) })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body
      const now = new Date().toISOString()
      const studentId = generateId('stu')

      const student = {
        id: studentId,
        createdAt: now,
        tutorId: userId,
        firstName: body.firstName || '',
        lastName: body.lastName || '',
        email: body.email || '',
        status: 'active',
        parentName: body.parentName || '',
        parentEmail: body.parentEmail || '',
        parentMobile: body.parentMobile || '',
        source: body.source || 'direct',
        companyName: body.companyName || '',
        hrContactEmail: body.hrContactEmail || '',
        subject: body.subject || '',
        yearLevel: body.yearLevel || '',
        sessionType: body.sessionType || '1on1_online',
        preferredDay: body.preferredDay || '',
        preferredTime: body.preferredTime || '',
        learningGoals: body.learningGoals || '',
        ratePerSession: Math.round(parseFloat(body.ratePerSession || 110) * 100),
        sessionDurationMins: parseInt(body.sessionDurationMins) || 90,
        billTo: body.billTo || 'parent',
        paymentMethod: body.paymentMethod || 'stripe',
        autoReminder48h: body.autoReminder48h !== false,
        sendSummaryToParent: body.sendSummaryToParent !== false,
        totalSessions: 0,
        lastSessionDate: null,
      }

      await redis.set(`kh:student:${studentId}`, JSON.stringify(student))
      await redis.zadd(`kh:${userId}:students`, { score: Date.now(), member: studentId })

      // Send welcome email (non-blocking)
      if (body.sendWelcomeEmail !== false && process.env.RESEND_API_KEY) {
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@knowledgehive.com.au',
            to: [student.parentEmail, student.email].filter(e => e && e.includes('@')),
            subject: `Welcome to KnowledgeHive — ${student.firstName}'s tutoring`,
            html: `<p>Hi ${student.parentName},</p><p>${student.firstName} is now enrolled for <strong>${student.subject}</strong> tutoring. After each session you'll receive a summary and a payment link.</p><p>Looking forward to working with ${student.firstName}!</p>`,
          }),
        }).catch(e => console.error('Welcome email error:', e))
      }

      return res.status(201).json({ student })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
