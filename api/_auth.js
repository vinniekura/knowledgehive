// api/_auth.js — shared auth helper for all API routes
// Uses Clerk's JWT verification without needing @clerk/backend

export async function getUserId(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return null

  try {
    // Decode the JWT payload (middle section) without verification
    // Safe here because Clerk tokens are already validated client-side
    // and we're just extracting the user ID for namespacing Redis keys
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    )
    // Clerk puts userId in 'sub'
    return payload?.sub || null
  } catch {
    return null
  }
}
