import { Redis } from '@upstash/redis'
import { getUserId } from '../_auth.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })
  const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  const admins = await redis.smembers('kh:admins')
  if (!admins.includes(userId)) return res.status(403).json({ error: 'Admin only' })
  const current = await redis.get('kh:platform:settings') || {}
  const updated = { ...current, ...req.body, updatedAt: new Date().toISOString() }
  await redis.set('kh:platform:settings', JSON.stringify(updated))
  return res.json({ settings: updated })
}
