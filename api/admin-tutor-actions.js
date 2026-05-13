// api/admin-tutor-actions.js
// POST with action: 'delete' | 'edit'
import { Redis } from '@upstash/redis'
import { getUserId } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  const admins = await redis.smembers('kh:admins')
  if (!admins.includes(userId)) return res.status(403).json({ error: 'Admin only' })
  const adminRec = await redis.get(`kh:admin:${userId}`)
  if (adminRec?.role !== 'super') return res.status(403).json({ error: 'Super admin required' })

  const { action, tutorId, updates } = req.body
  if (!tutorId) return res.status(400).json({ error: 'tutorId required' })

  const tutor = await redis.get(`kh:tutor:${tutorId}`)
  if (!tutor) return res.status(404).json({ error: 'Tutor not found' })

  if (action === 'delete') {
    // Soft delete — mark inactive, remove from index
    await redis.set(`kh:tutor:${tutorId}`, JSON.stringify({ ...tutor, status: 'inactive', deletedAt: new Date().toISOString() }))
    await redis.zrem('kh:tutors', tutorId)
    return res.json({ success: true })
  }

  if (action === 'edit') {
    const updated = { ...tutor, ...updates, id: tutorId, updatedAt: new Date().toISOString() }
    await redis.set(`kh:tutor:${tutorId}`, JSON.stringify(updated))
    return res.json({ tutor: updated })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
