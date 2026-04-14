// api/students.js
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

function dollarsToCents(dollars) {
  return Math.round(parseFloat(dollars) * 100)
}

// Extract Clerk userId from the session token
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

  const userId = await getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const redis = getRedis()
  const studentsKey = `kh:${userId}:students`

  // GET — list students
  if (req.method === 'GET') {
    try {
      const ids = await redis.zrange(studentsKey, 0, -1, { rev: true })
      const students = ids.length
        ? await Promise.all(ids.map(id => redis.get(`kh:student:${id}`)))
        : []
      return res.status(200).json({ students: students.filter(Boolean) })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // POST — create student
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
        ratePerSession: dollarsToCents(body.ratePerSession || 110),
        sessionDurationMins: parseInt(body.sessionDurationMins) || 90,
        billTo: body.billTo || 'parent',
        paymentMethod: body.paymentMethod || 'stripe',
        autoReminder48h: body.autoReminder48h !== false,
        sendSummaryToParent: body.sendSummaryToParent !== false,
        totalSessions: 0,
        lastSessionDate: null,
      }

      await redis.set(`kh:student:${studentId}`, JSON.stringify(student))
      await redis.zadd(studentsKey, { score: Date.now(), member: studentId })

      // Send welcome email via Resend (non-blocking)
      if (body.sendWelcomeEmail !== false && process.env.RESEND_API_KEY) {
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@knowledgehive.com.au',
            to: [student.parentEmail, student.email].filter(Boolean),
            subject: `Welcome to KnowledgeHive — ${student.firstName}'s tutoring starts soon`,
            html: `<p>Hi ${student.parentName},</p><p>${student.firstName} is now enrolled for ${student.subject} tutoring. After each session you'll receive a summary and payment link.</p><p>Looking forward to working with ${student.firstName}!</p>`,
          }),
        }).catch(err => console.error('Welcome email error:', err))
      }

      return res.status(201).json({ student })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
