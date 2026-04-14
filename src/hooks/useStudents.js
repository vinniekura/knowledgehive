import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'

export function useStudents() {
  const { getToken } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/students', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setStudents(data.students || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const addStudent = useCallback(async (payload) => {
    const token = await getToken()
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to add student')
    setStudents(prev => [data.student, ...prev])
    return data.student
  }, [getToken])

  return { students, loading, error, refetch: fetchStudents, addStudent }
}
