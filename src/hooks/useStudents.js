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
      const text = await res.text()
      const data = JSON.parse(text)
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
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { throw new Error(text) }
    if (!res.ok) throw new Error(data.error || 'Failed to add student')
    setStudents(prev => [data.student, ...prev])
    return data.student
  }, [getToken])

  const deleteStudent = useCallback(async (studentId) => {
    const token = await getToken()
    // Use flat POST route to avoid Vercel dynamic routing issues
    const res = await fetch('/api/delete-student', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: studentId }),
    })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { throw new Error(text) }
    if (!res.ok) throw new Error(data.error || 'Failed to delete student')
    setStudents(prev => prev.filter(s => s.id !== studentId))
  }, [getToken])

  return { students, loading, error, refetch: fetchStudents, addStudent, deleteStudent }
}
