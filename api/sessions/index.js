// api/sessions/index.js
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
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const redis = getRedis()

  if (req.method === 'GET') {
    const ids = await redis.zrange(`kh:${userId}:sessions`, 0, -1, { rev: true })
    const sessions = ids.length
      ? await Promise.all(ids.map(id => redis.get(`kh:session:${id}`)))
      : []
    return res.status(200).json({ sessions: sessions.filter(Boolean) })
  }

  if (req.method === 'POST') {
    const { studentId, scheduledDate, scheduledTime, durationMins, subject } = req.body
    const student = await redis.get(`kh:student:${studentId}`)
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const sessionId = generateId('ses')
    const session = {
      id: sessionId, createdAt: new Date().toISOString(), tutorId: userId,
      studentId, studentName: `${student.firstName} ${student.lastName}`,
      scheduledDate, scheduledTime: scheduledTime || '15:00',
      durationMins: durationMins || student.sessionDurationMins || 90,
      subject: subject || student.subject,
      sessionType: student.sessionType, status: 'scheduled',
      topicsCovered: [], needsMoreWork: [], homeworkSet: [],
      notesForParent: '', privateTutorNotes: '',
      rateAud: student.ratePerSession, paymentStatus: 'pending',
    }
    await redis.set(`kh:session:${sessionId}`, JSON.stringify(session))
    await redis.zadd(`kh:${userId}:sessions`, { score: new Date(scheduledDate).getTime(), member: sessionId })
    return res.status(201).json({ session })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
