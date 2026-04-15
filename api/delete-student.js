import { Redis } from '@upstash/redis'
import { getUserId } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })
  const { id } = req.body
  const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  const student = await redis.get(`kh:student:${id}`)
  if (!student) return res.status(404).json({ error: 'Not found' })
  if (student.tutorId !== userId) return res.status(403).json({ error: 'Forbidden' })
  await redis.set(`kh:student:${id}`, JSON.stringify({ ...student, status: 'inactive' }))
  await redis.zrem(`kh:${userId}:students`, id)
  return res.status(200).json({ success: true })
}
