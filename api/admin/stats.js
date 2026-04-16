import { Redis } from '@upstash/redis'
import { getUserId } from '../_auth.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  const admins = await redis.smembers('kh:admins')
  if (!admins.includes(userId)) return res.status(403).json({ error: 'Admin only' })

  // Get this admin's role
  const adminRecord = await redis.get(`kh:admin:${userId}`)
  const role = adminRecord?.role || 'ops'

  const tutorIds = await redis.zrange('kh:tutors', 0, -1)
  const tutors = tutorIds.length
    ? await Promise.all(tutorIds.map(id => redis.get(`kh:tutor:${id}`)))
    : []
  const activeTutors = tutors.filter(t => t?.status === 'active')

  let totalStudents = 0, totalSessions = 0, totalRevenue = 0, totalFees = 0
  for (const tutor of activeTutors) {
    if (!tutor) continue
    totalStudents += tutor.totalStudents || 0
    totalSessions += tutor.totalSessions || 0
    const invoiceIds = await redis.zrange(`kh:${tutor.id}:invoices`, 0, -1)
    const invoices = invoiceIds.length
      ? await Promise.all(invoiceIds.map(id => redis.get(`kh:invoice:${id}`)))
      : []
    for (const inv of invoices.filter(Boolean)) {
      if (inv.status === 'paid') {
        totalRevenue += inv.amountAud || 0
        totalFees += Math.round((inv.amountAud || 0) * (tutor.feePercent || 0) / 100)
      }
    }
  }

  return res.json({
    role, // 'super' or 'ops' — used by frontend to show/hide controls
    activeTutors: activeTutors.length,
    totalStudents,
    totalSessions,
    totalRevenue,
    totalFees,
    tutors: activeTutors,
  })
}
