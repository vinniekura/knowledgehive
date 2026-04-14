// api/invoices.js
// GET /api/invoices — list all invoices for tutor

import { getAuth } from '@clerk/express'
import { getJson, getIndex, keys } from '../src/lib/redis.js'

export default async function handler(req, res) {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  if (req.method === 'GET') {
    const ids = await getIndex(keys.tutorInvoices(userId))
    const invoices = await Promise.all(ids.map(id => getJson(keys.invoice(id))))
    return res.json({ invoices: invoices.filter(Boolean) })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
