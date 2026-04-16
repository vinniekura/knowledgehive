// api/admin/setup.js
// POST - register a user as admin with a role
// role: 'super' (full access) or 'ops' (no fee/admin changes)
import { Redis } from '@upstash/redis'
import { getUserId } from '../_auth.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const { secret, role = 'ops' } = req.body
  if (secret !== process.env.ADMIN_SETUP_SECRET) return res.status(403).json({ error: 'Wrong secret' })

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  // Store admin with role: kh:admin:{userId} = { role, addedAt }
  await redis.sadd('kh:admins', userId)
  await redis.set(`kh:admin:${userId}`, JSON.stringify({
    userId,
    role, // 'super' or 'ops'
    addedAt: new Date().toISOString(),
  }))

  return res.json({ success: true, userId, role, message: `You are now a ${role} admin` })
}
