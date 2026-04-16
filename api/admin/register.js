// api/register.js - Public tutor self-registration (auto-approve)
import { Redis } from '@upstash/redis'

function generateId(prefix = '') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { firstName, lastName, email, businessName, subjects, bio, mobile } = req.body
  if (!firstName || !lastName || !email) return res.status(400).json({ error: 'Name and email required' })

  const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })

  // Check if email already registered
  const existing = await redis.get(`kh:email:${email}`)
  if (existing) return res.status(409).json({ error: 'Email already registered' })

  // Get platform default fee
  const platformSettings = await redis.get('kh:platform:settings')
  const defaultFee = platformSettings?.onboardingFeePercent ?? 0

  const tutorId = generateId('tut')
  const now = new Date().toISOString()
  const tutor = {
    id: tutorId, createdAt: now,
    firstName, lastName, email, mobile: mobile || '',
    businessName: businessName || `${firstName} ${lastName} Tutoring`,
    abn: '', gstRegistered: false,
    bio: bio || '',
    subjects: subjects || [],
    feePercent: defaultFee,
    status: 'active', // auto-approve
    paymentMethod: 'platform',
    stripeAccountId: null,
    payId: null, bsb: null, accountNumber: null,
    logoUrl: null, brandColour: '#0d9488',
    dailyEmailEnabled: true,
    settingsComplete: false,
    totalStudents: 0, totalSessions: 0,
    defaultRate: 11000, // $110 in cents
    defaultSessionMins: 90,
  }

  await redis.set(`kh:tutor:${tutorId}`, JSON.stringify(tutor))
  await redis.zadd('kh:tutors', { score: Date.now(), member: tutorId })
  await redis.set(`kh:email:${email}`, tutorId)

  // Send welcome email
  if (process.env.RESEND_API_KEY) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@datamastery.com.au',
        to: email,
        subject: 'Welcome to TutorMastery — your account is ready',
        html: `
          <p>Hi ${firstName},</p>
          <p>Welcome to TutorMastery! Your account has been approved and is ready to use.</p>
          <p><strong>Sign in now:</strong> <a href="${process.env.VITE_APP_URL || 'https://tutormastery.datamastery.com.au'}">tutormastery.datamastery.com.au</a></p>
          <p>Once you sign in, complete your settings (payment method, logo, business details) and you can start adding students immediately.</p>
          <p>Welcome aboard!<br>TutorMastery Team</p>
        `,
      }),
    }).catch(e => console.error('Welcome email error:', e))

    // Notify admin
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@datamastery.com.au',
        to: process.env.ADMIN_EMAIL || 'vinnie.kura@gmail.com',
        subject: `New tutor registered: ${firstName} ${lastName}`,
        html: `<p>New tutor auto-approved:</p><p><strong>${firstName} ${lastName}</strong><br>${email}<br>${businessName || ''}<br>Subjects: ${(subjects||[]).join(', ')}</p>`,
      }),
    }).catch(e => console.error('Admin notification error:', e))
  }

  return res.status(201).json({ tutor, message: 'Registration successful' })
}
