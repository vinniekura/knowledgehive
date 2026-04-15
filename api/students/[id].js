// api/students/[id].js
// DELETE /api/students/:id  — soft delete
// PATCH  /api/students/:id  — update fields
import { Redis } from '@upstash/redis'
import { getUserId } from '../_auth.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Student ID required' })

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  const student = await redis.get(`kh:student:${id}`)
  if (!student) return res.status(404).json({ error: 'Student not found' })
  if (student.tutorId !== userId) return res.status(403).json({ error: 'Forbidden' })

  if (req.method === 'DELETE') {
    await redis.set(`kh:student:${id}`, JSON.stringify({ ...student, status: 'inactive' }))
    await redis.zrem(`kh:${userId}:students`, id)
    return res.status(200).json({ success: true })
  }

  if (req.method === 'PATCH') {
    const updated = { ...student, ...req.body }
    await redis.set(`kh:student:${id}`, JSON.stringify(updated))
    return res.status(200).json({ student: updated })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
