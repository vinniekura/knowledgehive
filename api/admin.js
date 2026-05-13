import { Redis } from '@upstash/redis'
import { getUserId } from './_auth.js'

function r() { return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }) }
function gid(p='') { return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}` }
async function getRole(redis, uid) {
  const a = await redis.smembers('kh:admins')
  if (!a.includes(uid)) return null
  const rec = await redis.get(`kh:admin:${uid}`)
  return rec?.role || 'ops'
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  const { action } = req.query
  const redis = r()

  if (action === 'setup' && req.method === 'POST') {
    const uid = await getUserId(req)
    if (!uid) return res.status(401).json({ error: 'Unauthorised' })
    if (req.body?.secret !== process.env.ADMIN_SETUP_SECRET) return res.status(403).json({ error: 'Wrong secret' })
    const rl = req.body?.role || 'ops'
    await redis.sadd('kh:admins', uid)
    await redis.set(`kh:admin:${uid}`, JSON.stringify({ userId: uid, role: rl, addedAt: new Date().toISOString() }))
    return res.json({ success: true, userId: uid, role: rl })
  }

  const uid = await getUserId(req)
  if (!uid) return res.status(401).json({ error: 'Unauthorised' })
  const rl = await getRole(redis, uid)
  if (!rl) return res.status(403).json({ error: 'Admin only' })

  if (action === 'add-admin' && req.method === 'POST') {
    if (rl !== 'super') return res.status(403).json({ error: 'Super admin required' })
    const { email, newRole = 'ops', directUserId } = req.body
    if (directUserId) {
      await redis.sadd('kh:admins', directUserId)
      await redis.set(`kh:admin:${directUserId}`, JSON.stringify({ userId: directUserId, role: newRole, addedBy: uid, addedAt: new Date().toISOString() }))
      return res.json({ success: true, pending: false, targetUserId: directUserId, role: newRole })
    }
    if (!email) return res.status(400).json({ error: 'Email or directUserId required' })
    const targetUid = await redis.get(`kh:email:${email}`)
    const resolvedUid = (targetUid && targetUid.startsWith('user_')) ? targetUid : null
    if (!resolvedUid) {
      await redis.set(`kh:pending-admin:${email}`, JSON.stringify({ email, role: newRole, addedBy: uid, addedAt: new Date().toISOString() }))
      return res.json({ success: true, pending: true, message: `${email} will get ${newRole} access on next sign-in` })
    }
    await redis.sadd('kh:admins', resolvedUid)
    await redis.set(`kh:admin:${resolvedUid}`, JSON.stringify({ userId: resolvedUid, role: newRole, addedBy: uid, addedAt: new Date().toISOString() }))
    return res.json({ success: true, pending: false, targetUserId: resolvedUid, role: newRole })
  }

  if (action === 'list-admins' && req.method === 'GET') {
    if (rl !== 'super') return res.status(403).json({ error: 'Super admin required' })
    const ids = await redis.smembers('kh:admins')
    const admins = ids.length ? await Promise.all(ids.map(id => redis.get(`kh:admin:${id}`))) : []
    return res.json({ admins: admins.filter(Boolean) })
  }

  if (action === 'stats' && req.method === 'GET') {
    const tids = await redis.zrange('kh:tutors', 0, -1)
    const tutors = tids.length ? await Promise.all(tids.map(id => redis.get(`kh:tutor:${id}`))) : []
    const active = tutors.filter(t => t?.status === 'active')
    let ts=0,ss=0,rev=0,fees=0
    for (const t of active) {
      if (!t) continue
      ts+=t.totalStudents||0; ss+=t.totalSessions||0
      const iids = await redis.zrange(`kh:${t.id}:invoices`,0,-1)
      const invs = iids.length ? await Promise.all(iids.map(id=>redis.get(`kh:invoice:${id}`))) : []
      for (const inv of invs.filter(Boolean)) { if(inv.status==='paid'){rev+=inv.amountAud||0;fees+=Math.round((inv.amountAud||0)*(t.feePercent||0)/100)} }
    }
    const bank = await redis.get('kh:platform:bank') || {}
    return res.json({ role: rl, activeTutors: active.length, totalStudents: ts, totalSessions: ss, totalRevenue: rev, totalFees: fees, tutors: active, bankSettings: bank })
  }

  if (action === 'tutors') {
    if (req.method === 'GET') {
      const ids = await redis.zrange('kh:tutors',0,-1,{rev:true})
      const t = ids.length ? await Promise.all(ids.map(id=>redis.get(`kh:tutor:${id}`))) : []
      return res.json({ tutors: t.filter(Boolean) })
    }
    if (req.method === 'POST') {
      const { firstName, lastName, email, businessName, subjects, feePercent } = req.body
      const tid = gid('tut')
      const tutor = { id:tid, createdAt:new Date().toISOString(), firstName, lastName, email, businessName:businessName||`${firstName} ${lastName} Tutoring`, abn:'', subjects:subjects||[], feePercent:feePercent??0, status:'active', paymentMethod:'platform', totalStudents:0, totalSessions:0,
        // Payment settings — all blank until Super Admin sets them
        paymentConfig: { method: 'platform', stripePaymentLink: '', payId: '', bsb: '', accountNumber: '', accountName: '', allowTutorEdit: false }
      }
      await redis.set(`kh:tutor:${tid}`, JSON.stringify(tutor))
      await redis.zadd('kh:tutors',{score:Date.now(),member:tid})
      await redis.set(`kh:email:${email}`, tid)
      if (process.env.RESEND_API_KEY) fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL||'noreply@datamastery.com.au',to:email,subject:'Welcome to TutorMastery',html:`<p>Hi ${firstName}, your account is ready. <a href="${process.env.VITE_APP_URL||'https://tutormastery.datamastery.com.au'}">Sign in here →</a></p>`})}).catch(e=>console.error(e))
      return res.status(201).json({ tutor })
    }
  }

  // TUTOR-PAYMENT-SETTINGS — Super Admin sets payment config per tutor
  if (action === 'tutor-payment' && req.method === 'POST') {
    if (rl !== 'super') return res.status(403).json({ error: 'Super admin required' })
    const { tutorId, paymentConfig } = req.body
    if (!tutorId) return res.status(400).json({ error: 'tutorId required' })
    const tutor = await redis.get(`kh:tutor:${tutorId}`)
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' })
    const updated = { ...tutor, paymentConfig: { ...tutor.paymentConfig, ...paymentConfig } }
    await redis.set(`kh:tutor:${tutorId}`, JSON.stringify(updated))
    return res.json({ tutor: updated })
  }

  if (action === 'tutor-settings' && req.method === 'POST') {
    const { tutorId, feePercent, status } = req.body
    if (rl !== 'super' && (feePercent !== undefined || status === 'suspended')) return res.status(403).json({ error: 'Super admin required' })
    const t = await redis.get(`kh:tutor:${tutorId}`)
    if (!t) return res.status(404).json({ error: 'Not found' })
    const u = { ...t, feePercent:feePercent??t.feePercent, status:status||t.status }
    await redis.set(`kh:tutor:${tutorId}`, JSON.stringify(u))
    return res.json({ tutor: u })
  }

  if (action === 'platform-settings' && req.method === 'POST') {
    if (rl !== 'super') return res.status(403).json({ error: 'Super admin required' })
    const cur = await redis.get('kh:platform:settings') || {}
    const upd = { ...cur, ...req.body, updatedAt: new Date().toISOString() }
    await redis.set('kh:platform:settings', JSON.stringify(upd))
    return res.json({ settings: upd })
  }

  if (action === 'bank-settings') {
    if (req.method === 'GET') { const b = await redis.get('kh:platform:bank')||{}; return res.json({bank:b}) }
    if (req.method === 'POST') {
      if (rl !== 'super') return res.status(403).json({ error: 'Super admin required' })
      const { accountName, bsb, accountNumber, payId, bank:bn } = req.body
      const bd = { accountName, bsb, accountNumber, payId, bank:bn, updatedAt:new Date().toISOString() }
      await redis.set('kh:platform:bank', JSON.stringify(bd))
      return res.json({ success:true, bank:bd })
    }
  }

  return res.status(400).json({ error: 'Unknown action' })
}
