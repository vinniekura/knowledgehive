import { Redis } from '@upstash/redis'

async function getUserId(req) {
  try {
    const { createClerkClient } = await import('@clerk/backend')
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return null
    const payload = await clerk.verifyToken(token)
    return payload?.sub || null
  } catch { return null }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  const ids = await redis.zrange(`kh:${userId}:invoices`, 0, -1, { rev: true })
  const invoices = ids.length ? await Promise.all(ids.map(id => redis.get(`kh:invoice:${id}`))) : []
  return res.status(200).json({ invoices: invoices.filter(Boolean) })
}
