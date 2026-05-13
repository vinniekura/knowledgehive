import { Redis } from '@upstash/redis'
import { getUserId } from '../_auth.js'

function getRedis() { return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }) }
function gid(p='') { return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}` }

function buildPaymentBlock(amount, paymentConfig, platformBank) {
  const display = `$${(amount/100).toFixed(2)}`
  const cfg = paymentConfig || {}
  const method = cfg.method || 'platform'
  const blocks = []

  if ((method==='stripe'||method==='both') && cfg.stripePaymentLink) {
    blocks.push(`<div style="text-align:center;padding:20px;background:#ccfbf1;border:1px solid #99f6e4;border-radius:12px;margin:16px 0"><div style="font-size:28px;font-weight:700;color:#115e59">${display}</div><div style="font-size:12px;color:#0f766e;margin:4px 0 12px">Session fee</div><a href="${cfg.stripePaymentLink}" style="display:inline-block;background:#0d9488;color:#fff;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">Pay Now via Stripe →</a><div style="font-size:11px;color:#0f766e;margin-top:8px">Secure card payment · takes about 30 seconds</div></div>`)
  }

  const bankToUse = (method==='payid'||method==='both') ? cfg : method==='platform' ? platformBank : null
  if (bankToUse && (bankToUse.payId||bankToUse.bsb)) {
    blocks.push(`<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:16px 0"><div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:12px">Pay via Bank Transfer / PayID</div><div style="font-size:24px;font-weight:700;color:#78350f;margin-bottom:12px">${display}</div><table style="width:100%;font-size:13px;color:#78350f">${bankToUse.accountName?`<tr><td style="padding:3px 0;opacity:0.7">Account Name</td><td style="font-weight:600;text-align:right">${bankToUse.accountName}</td></tr>`:''  }${bankToUse.payId?`<tr><td style="padding:3px 0;opacity:0.7">PayID</td><td style="font-weight:600;text-align:right">${bankToUse.payId}</td></tr>`:''  }${bankToUse.bsb?`<tr><td style="padding:3px 0;opacity:0.7">BSB</td><td style="font-weight:600;text-align:right">${bankToUse.bsb}</td></tr>`:''  }${bankToUse.accountNumber?`<tr><td style="padding:3px 0;opacity:0.7">Account</td><td style="font-weight:600;text-align:right">${bankToUse.accountNumber}</td></tr>`:''  }<tr><td style="padding:3px 0;opacity:0.7">Reference</td><td style="font-weight:600;text-align:right">Tuition payment</td></tr></table></div>`)
  }

  if (blocks.length===0) blocks.push(`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;text-align:center"><div style="font-size:24px;font-weight:700;color:#1e293b">${display}</div><div style="font-size:12px;color:#64748b;margin-top:4px">Your tutor will send payment details shortly.</div></div>`)

  return blocks.join('')
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })
  const redis = getRedis()
  const { sessionId, topicsCovered=[], needsMoreWork=[], homeworkSet=[], notesForParent='', privateTutorNotes='', sendEmailNow=true } = req.body
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  try {
    const session = await redis.get(`kh:session:${sessionId}`)
    if (!session) return res.status(404).json({ error: 'Session not found' })
    const student = await redis.get(`kh:student:${session.studentId}`)
    if (!student) return res.status(404).json({ error: 'Student not found' })
    const now = new Date().toISOString()

    // Get tutor's payment config
    const tutorIds = await redis.zrange('kh:tutors', 0, -1)
    const tutors = tutorIds.length ? await Promise.all(tutorIds.map(id=>redis.get(`kh:tutor:${id}`))) : []
    const tutorRecord = tutors.filter(Boolean).find(t=>t.id && t.id === session.tutorRecordId) || tutors.filter(Boolean)[0]
    const paymentConfig = tutorRecord?.paymentConfig || { method: 'platform' }
    const platformBank = await redis.get('kh:platform:bank') || {}

    const updatedSession = { ...session, status:'completed', topicsCovered, needsMoreWork, homeworkSet, notesForParent, privateTutorNotes, completedAt:now, paymentStatus:'pending' }
    await redis.set(`kh:session:${sessionId}`, JSON.stringify(updatedSession))

    const invoiceId = gid('inv')
    const invoice = { id:invoiceId, createdAt:now, tutorId:userId, studentId:session.studentId, studentName:session.studentName, sessionIds:[sessionId], amountAud:student.ratePerSession, status:'pending', dueDate:new Date(Date.now()+7*86400000).toISOString() }
    await redis.set(`kh:invoice:${invoiceId}`, JSON.stringify(invoice))
    await redis.zadd(`kh:${userId}:invoices`, {score:Date.now(),member:invoiceId})
    await redis.set(`kh:session:${sessionId}`, JSON.stringify({...updatedSession,invoiceId}))
    await redis.set(`kh:student:${session.studentId}`, JSON.stringify({...student,totalSessions:(student.totalSessions||0)+1,lastSessionDate:now}))

    let emailSent = false
    if (sendEmailNow && student.sendSummaryToParent && process.env.RESEND_API_KEY) {
      const li = arr=>arr.map(i=>`<li style="margin:3px 0">${i}</li>`).join('')
      const paymentBlock = buildPaymentBlock(student.ratePerSession, paymentConfig, platformBank)
      try {
        const er = await fetch('https://api.resend.com/emails', {
          method:'POST',
          headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
          body:JSON.stringify({
            from:process.env.RESEND_FROM_EMAIL||'noreply@datamastery.com.au',
            to:[student.parentEmail,student.email].filter(e=>e&&e.includes('@')),
            subject:`${student.firstName}'s session summary · ${session.subject}`,
            html:`<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b"><div style="background:#1e3a5f;padding:20px 28px;border-radius:12px 12px 0 0"><span style="font-size:20px;font-weight:700;color:#f59e0b">KnowledgeHive</span></div><div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 12px 12px"><p>Hi ${student.parentName||'there'},</p><p>Great session with ${student.firstName} today!</p>${topicsCovered.length?`<p><strong>Covered:</strong><ul style="margin:6px 0;padding-left:20px">${li(topicsCovered)}</ul></p>`:''}${needsMoreWork.length?`<p><strong>Focus next time:</strong><ul style="margin:6px 0;padding-left:20px">${li(needsMoreWork)}</ul></p>`:''}${homeworkSet.length?`<p><strong>Homework:</strong><ul style="margin:6px 0;padding-left:20px">${li(homeworkSet)}</ul></p>`:''}${notesForParent?`<p>${notesForParent}</p>`:''}${paymentBlock}<p style="margin-top:20px;font-size:13px;color:#64748b">Warm regards,<br><strong>KnowledgeHive</strong></p></div></div>`
          })
        })
        if (er.ok) emailSent=true; else console.error('Email error:',await er.text())
      } catch(e){console.error('Email error:',e)}
    }

    return res.status(200).json({ session:{...updatedSession,invoiceId}, invoice, emailSent })
  } catch(err) { return res.status(500).json({ error: err.message }) }
}
