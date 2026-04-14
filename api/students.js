// api/students.js
// POST /api/students  — create student, optionally create company record, send welcome email
// GET  /api/students  — list all students for the authenticated tutor

import { getAuth } from '@clerk/express'
import { getRedis, keys, setJson, getJson, addToIndex, getIndex } from '../src/lib/redis.js'
import { sendWelcomeEmail } from '../src/lib/email.js'
import { generateId, dollarsToCents } from '../src/lib/utils.js'

export default async function handler(req, res) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  // ── GET — list students ───────────────────────────────────────────────────
  if (req.method === 'GET') {
    const ids = await getIndex(keys.tutorStudents(userId))
    const students = await Promise.all(ids.map(id => getJson(keys.student(id))))
    return res.json({ students: students.filter(Boolean) })
  }

  // ── POST — create student ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body
    const now = new Date().toISOString()

    // Handle corporate company record
    let companyId = null
    if (body.source === 'corporate' && body.companyName) {
      // Check if company already exists for this tutor
      const companyIds = await getIndex(`kh:${userId}:companies`)
      let found = null
      for (const cid of companyIds) {
        const c = await getJson(keys.company(cid))
        if (c && c.name.toLowerCase() === body.companyName.toLowerCase()) {
          found = c; break
        }
      }
      if (!found) {
        companyId = generateId('cmp')
        const company = {
          id: companyId,
          createdAt: now,
          tutorId: userId,
          name: body.companyName,
          hrContactEmail: body.hrContactEmail || '',
          billingTermsDays: 30,
        }
        await setJson(keys.company(companyId), company)
        await addToIndex(`kh:${userId}:companies`, companyId)
      } else {
        companyId = found.id
      }
    }

    // Build student record
    const studentId = generateId('stu')
    const student = {
      id: studentId,
      createdAt: now,
      tutorId: userId,

      // Profile
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email || '',
      status: 'active',

      // Parent
      parentName: body.parentName,
      parentEmail: body.parentEmail,
      parentMobile: body.parentMobile || '',

      // Source
      source: body.source || 'direct',
      companyId,
      companyName: body.companyName || '',

      // Enrolment
      subject: body.subject,
      yearLevel: body.yearLevel || '',
      sessionType: body.sessionType || '1on1_online',
      preferredDay: body.preferredDay || '',
      preferredTime: body.preferredTime || '',
      learningGoals: body.learningGoals || '',

      // Payment config
      ratePerSession: dollarsToCents(body.ratePerSession || 110),
      sessionDurationMins: parseInt(body.sessionDurationMins) || 90,
      billTo: body.billTo || 'parent',
      paymentMethod: body.paymentMethod || 'stripe',
      autoReminder48h: body.autoReminder48h !== false,
      sendSummaryToParent: body.sendSummaryToParent !== false,

      // Stats
      totalSessions: 0,
      lastSessionDate: null,
    }

    // Save to Redis
    await setJson(keys.student(studentId), student)
    await addToIndex(keys.tutorStudents(userId), studentId)

    // Get tutor settings for name/appName in emails
    const settings = await getJson(keys.settings(userId)) || {}
    const tutorName = settings.tutorName || 'Your tutor'
    const appName = settings.appName || 'KnowledgeHive'

    // Send welcome email (non-blocking — don't fail the request if email fails)
    if (body.sendWelcomeEmail !== false) {
      sendWelcomeEmail({ student, tutorName, appName }).catch(err =>
        console.error('Welcome email failed:', err)
      )
    }

    return res.status(201).json({ student })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
