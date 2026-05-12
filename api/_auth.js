export async function getUserId(req) {
  const token = req.headers.authorization?.replace('Bearer ', '').trim()
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'))
    return payload?.sub || null
  } catch { return null }
}
