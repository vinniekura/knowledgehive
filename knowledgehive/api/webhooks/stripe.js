// api/webhooks/stripe.js
// Handles Stripe webhook events — marks invoice paid when payment completes

import Stripe from 'stripe'
import { getJson, setJson, keys } from '../../src/lib/redis.js'

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const rawBody = await getRawBody(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  // Handle payment completion
  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const obj = event.data.object
    const sessionId = obj.metadata?.session_id
    const studentId = obj.metadata?.student_id
    const tutorId = obj.metadata?.tutor_id

    if (sessionId) {
      // Find the invoice linked to this session
      const session = await getJson(keys.session(sessionId))
      if (session?.invoiceId) {
        const invoice = await getJson(keys.invoice(session.invoiceId))
        if (invoice) {
          await setJson(keys.invoice(session.invoiceId), {
            ...invoice,
            status: 'paid',
            paidAt: new Date().toISOString(),
            stripePaymentIntentId: obj.payment_intent || obj.id,
          })
        }
      }
    }
  }

  // Handle payment link payment (for payment links created outside checkout)
  if (event.type === 'payment_intent.succeeded') {
    // Already handled above
  }

  res.status(200).json({ received: true })
}
