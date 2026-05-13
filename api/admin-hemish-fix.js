// Temporary one-shot endpoint to grant Hemish ops access by userId directly
// Add to api/ folder, use once, then delete
import { Redis } from '@upstash/redis'
import { getUserId } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  
  const callerId = await getUserId(req)
  if (!callerId) return res.status(401).json({ error: 'Unauthorised' })
  
  // Only Vinnie's super admin can call this
  const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  const admins = await redis.smembers('kh:admins')
  const callerRecord = await redis.get(`kh:admin:${callerId}`)
  if (!admins.includes(callerId) || callerRecord?.role !== 'super') {
    return res.status(403).json({ error: 'Super admin required' })
  }

  const { targetUserId, secret } = req.body
  if (secret !== process.env.ADMIN_SETUP_SECRET) return res.status(403).json({ error: 'Wrong secret' })
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' })

  await redis.sadd('kh:admins', targetUserId)
  await redis.set(`kh:admin:${targetUserId}`, JSON.stringify({
    userId: targetUserId,
    role: 'ops',
    addedBy: callerId,
    addedAt: new Date().toISOString()
  }))

  return res.json({ success: true, targetUserId, role: 'ops' })
}
