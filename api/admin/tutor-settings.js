import { Redis } from '@upstash/redis'
import { getUserId } from '../_auth.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  const admins = await redis.smembers('kh:admins')
  if (!admins.includes(userId)) return res.status(403).json({ error: 'Admin only' })

  // Check role — only super admins can change fees
  const adminRecord = await redis.get(`kh:admin:${userId}`)
  const role = adminRecord?.role || 'ops'

  const { tutorId, feePercent, status } = req.body

  // Ops admins cannot change fees or suspend
  if (role !== 'super' && (feePercent !== undefined || status === 'suspended')) {
    return res.status(403).json({ error: 'Super admin required to change fees or suspend tutors' })
  }

  const tutor = await redis.get(`kh:tutor:${tutorId}`)
  if (!tutor) return res.status(404).json({ error: 'Tutor not found' })

  const updated = {
    ...tutor,
    feePercent: feePercent !== undefined ? feePercent : tutor.feePercent,
    status: status || tutor.status,
  }
  await redis.set(`kh:tutor:${tutorId}`, JSON.stringify(updated))
  return res.json({ tutor: updated })
}
