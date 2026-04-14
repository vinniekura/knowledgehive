// lib/redis.js
// Thin wrapper around Upstash Redis REST client
// All keys are namespaced under kh: (KnowledgeHive)
// Shares the same Upstash instance as Market Mastery (mm:) and Content Mastery (cm:)

import { Redis } from '@upstash/redis'

let _client = null

export function getRedis() {
  if (_client) return _client
  _client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return _client
}

// ─── Key Builders ─────────────────────────────────────────────────────────────
// Convention: kh:{entity}:{id}
// Sets for index:  kh:{tutorId}:students  (SET of student IDs)

export const keys = {
  // Entities
  student:  (id)       => `kh:student:${id}`,
  session:  (id)       => `kh:session:${id}`,
  invoice:  (id)       => `kh:invoice:${id}`,
  company:  (id)       => `kh:company:${id}`,
  settings: (tutorId)  => `kh:settings:${tutorId}`,

  // Indexes (sorted sets — score = createdAt timestamp)
  tutorStudents:  (tutorId) => `kh:${tutorId}:students`,
  tutorSessions:  (tutorId) => `kh:${tutorId}:sessions`,
  tutorInvoices:  (tutorId) => `kh:${tutorId}:invoices`,
  studentSessions:(studentId) => `kh:student:${studentId}:sessions`,
}

// ─── Generic Helpers ──────────────────────────────────────────────────────────

export async function setJson(key, value, exSeconds = null) {
  const redis = getRedis()
  if (exSeconds) {
    return redis.set(key, JSON.stringify(value), { ex: exSeconds })
  }
  return redis.set(key, JSON.stringify(value))
}

export async function getJson(key) {
  const redis = getRedis()
  const raw = await redis.get(key)
  if (!raw) return null
  if (typeof raw === 'object') return raw   // Upstash auto-parses
  try { return JSON.parse(raw) } catch { return raw }
}

export async function addToIndex(indexKey, id, score = null) {
  const redis = getRedis()
  const s = score ?? Date.now()
  return redis.zadd(indexKey, { score: s, member: id })
}

export async function getIndex(indexKey, limit = 100) {
  const redis = getRedis()
  // Returns members newest first
  return redis.zrange(indexKey, 0, limit - 1, { rev: true })
}

export async function deleteFromIndex(indexKey, id) {
  const redis = getRedis()
  return redis.zrem(indexKey, id)
}
