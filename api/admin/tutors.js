// api/admin/tutors.js - GET all tutors, POST create tutor
import { Redis } from '@upstash/redis'
import { getUserId } from '../_auth.js'

function getRedis() {
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
}
function generateId(prefix = '') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`
}

async function isAdmin(userId) {
  const redis = getRedis()
  const admins = await redis.smembers('kh:admins')
  return admins.includes(userId)
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })
  const admin = await isAdmin(userId)
  if (!admin) return res.status(403).json({ error: 'Admin only' })

  const redis = getRedis()

  if (req.method === 'GET') {
    const ids = await redis.zrange('kh:tutors', 0, -1, { rev: true })
    const tutors = ids.length ? await Promise.all(ids.map(id => redis.get(`kh:tutor:${id}`))) : []
    return res.json({ tutors: tutors.filter(Boolean) })
  }

  if (req.method === 'POST') {
    const { firstName, lastName, email, businessName, abn, subjects, feePercent } = req.body
    const tutorId = generateId('tut')
    const now = new Date().toISOString()
    const tutor = {
      id: tutorId, createdAt: now,
      firstName, lastName, email,
      businessName: businessName || `${firstName} ${lastName} Tutoring`,
      abn: abn || '',
      subjects: subjects || [],
      feePercent: feePercent ?? 0, // 0 = free onboarding period
      status: 'active',
      paymentMethod: 'platform', // default to platform account
      stripeAccountId: null,
      payId: null, bsb: null, accountNumber: null,
      logoUrl: null, brandColour: '#0d9488',
      dailyEmailEnabled: true,
      settingsComplete: false,
      totalStudents: 0, totalSessions: 0,
    }
    await redis.set(`kh:tutor:${tutorId}`, JSON.stringify(tutor))
    await redis.zadd('kh:tutors', { score: Date.now(), member: tutorId })
    // Also register as a Clerk-compatible userId mapping
    await redis.set(`kh:email:${email}`, tutorId)
    return res.status(201).json({ tutor })
  }
  return res.status(405).json({ error: 'Method not allowed' })
}
