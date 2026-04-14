import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'

export function useSessions() {
  const { getToken } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const text = await res.text()
      const data = JSON.parse(text)
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('Sessions fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const wrapSession = useCallback(async (payload) => {
    const token = await getToken()
    const res = await fetch('/api/sessions/wrap', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { throw new Error(text) }
    if (!res.ok) throw new Error(data.error || 'Failed to wrap session')
    setSessions(prev => prev.map(s => s.id === payload.sessionId ? data.session : s))
    return data
  }, [getToken])

  const createSession = useCallback(async (payload) => {
    const token = await getToken()
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { throw new Error(text) }
    if (!res.ok) throw new Error(data.error || 'Failed to create session')
    setSessions(prev => [data.session, ...prev])
    return data.session
  }, [getToken])

  return { sessions, loading, refetch: fetchSessions, wrapSession, createSession }
}
