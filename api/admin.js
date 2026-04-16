// api/admin.js — handles all admin routes via ?action= param
// Consolidates: stats, tutors, tutor-settings, platform-settings, setup
// Keeps us under Vercel Hobby 12 function limit
import { Redis } from '@upstash/redis'
import { getUserId } from './_auth.js'

function getRedis() {
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
}
function generateId(p='') { return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}` }

async function getAdminRole(redis, userId) {
  const admins = await redis.smembers('kh:admins')
  if (!admins.includes(userId)) return null
  const rec = await redis.get(`kh:admin:${userId}`)
  return rec?.role || 'ops'
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  const { action } = req.query

  // SETUP — uses secret, no admin check needed
  if (action === 'setup' && req.method === 'POST') {
    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorised' })
    if (req.body?.secret !== process.env.ADMIN_SETUP_SECRET) return res.status(403).json({ error: 'Wrong secret' })
    const redis = getRedis()
    const role = req.body?.role || 'ops'
    await redis.sadd('kh:admins', userId)
    await redis.set(`kh:admin:${userId}`, JSON.stringify({ userId, role, addedAt: new Date().toISOString() }))
    return res.json({ success: true, userId, role })
  }

  // All other actions require admin auth
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })
  const redis = getRedis()
  const role = await getAdminRole(redis, userId)
  if (!role) return res.status(403).json({ error: 'Admin only' })

  // STATS — GET aggregate metrics + tutor list
  if (action === 'stats' && req.method === 'GET') {
    const tutorIds = await redis.zrange('kh:tutors', 0, -1)
    const tutors = tutorIds.length ? await Promise.all(tutorIds.map(id => redis.get(`kh:tutor:${id}`))) : []
    const activeTutors = tutors.filter(t => t?.status === 'active')
    let totalStudents=0, totalSessions=0, totalRevenue=0, totalFees=0
    for (const t of activeTutors) {
      if (!t) continue
      totalStudents += t.totalStudents||0
      totalSessions += t.totalSessions||0
      const invIds = await redis.zrange(`kh:${t.id}:invoices`, 0, -1)
      const invs = invIds.length ? await Promise.all(invIds.map(id => redis.get(`kh:invoice:${id}`))) : []
      for (const inv of invs.filter(Boolean)) {
        if (inv.status==='paid') { totalRevenue+=inv.amountAud||0; totalFees+=Math.round((inv.amountAud||0)*(t.feePercent||0)/100) }
      }
    }
    return res.json({ role, activeTutors: activeTutors.length, totalStudents, totalSessions, totalRevenue, totalFees, tutors: activeTutors })
  }

  // TUTORS — GET list, POST create
  if (action === 'tutors') {
    if (req.method === 'GET') {
      const ids = await redis.zrange('kh:tutors', 0, -1, { rev: true })
      const tutors = ids.length ? await Promise.all(ids.map(id => redis.get(`kh:tutor:${id}`))) : []
      return res.json({ tutors: tutors.filter(Boolean) })
    }
    if (req.method === 'POST') {
      const { firstName, lastName, email, businessName, subjects, feePercent } = req.body
      const tutorId = generateId('tut')
      const tutor = {
        id: tutorId, createdAt: new Date().toISOString(),
        firstName, lastName, email,
        businessName: businessName || `${firstName} ${lastName} Tutoring`,
        abn:'', subjects: subjects||[], feePercent: feePercent??0,
        status:'active', paymentMethod:'platform',
        totalStudents:0, totalSessions:0, settingsComplete:false,
      }
      await redis.set(`kh:tutor:${tutorId}`, JSON.stringify(tutor))
      await redis.zadd('kh:tutors', { score: Date.now(), member: tutorId })
      await redis.set(`kh:email:${email}`, tutorId)
      if (process.env.RESEND_API_KEY) {
        fetch('https://api.resend.com/emails', {
          method:'POST',
          headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type':'application/json' },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL||'noreply@datamastery.com.au',
            to: email,
            subject: 'Welcome to TutorMastery',
            html: `<p>Hi ${firstName}, your tutor account is ready. <a href="${process.env.VITE_APP_URL||'https://tutormastery.datamastery.com.au'}">Sign in here</a></p>`,
          }),
        }).catch(e => console.error(e))
      }
      return res.status(201).json({ tutor })
    }
  }

  // TUTOR-SETTINGS — POST update fee/status per tutor
  if (action === 'tutor-settings' && req.method === 'POST') {
    const { tutorId, feePercent, status } = req.body
    if (role !== 'super' && (feePercent !== undefined || status === 'suspended'))
      return res.status(403).json({ error: 'Super admin required' })
    const tutor = await redis.get(`kh:tutor:${tutorId}`)
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' })
    const updated = { ...tutor, feePercent: feePercent??tutor.feePercent, status: status||tutor.status }
    await redis.set(`kh:tutor:${tutorId}`, JSON.stringify(updated))
    return res.json({ tutor: updated })
  }

  // PLATFORM-SETTINGS — POST update global settings
  if (action === 'platform-settings' && req.method === 'POST') {
    if (role !== 'super') return res.status(403).json({ error: 'Super admin required' })
    const current = await redis.get('kh:platform:settings') || {}
    const updated = { ...current, ...req.body, updatedAt: new Date().toISOString() }
    await redis.set('kh:platform:settings', JSON.stringify(updated))
    return res.json({ settings: updated })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
