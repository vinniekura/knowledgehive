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
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error(err)
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to wrap session')
    // Update local state
    setSessions(prev => prev.map(s => s.id === payload.sessionId ? data.session : s))
    return data
  }, [getToken])

  const createSession = useCallback(async (payload) => {
    const token = await getToken()
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create session')
    setSessions(prev => [data.session, ...prev])
    return data.session
  }, [getToken])

  return { sessions, loading, refetch: fetchSessions, wrapSession, createSession }
}
