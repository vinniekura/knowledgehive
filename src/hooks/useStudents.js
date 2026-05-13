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
      const res = await fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } })
      const data = JSON.parse(await res.text())
      setStudents(data.students || [])
    } catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const addStudent = useCallback(async (payload) => {
    const token = await getToken()
    const res = await fetch('/api/students', { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify(payload) })
    const data = JSON.parse(await res.text())
    if (!res.ok) throw new Error(data.error||'Failed to add student')
    setStudents(prev => [data.student, ...prev])
    return data.student
  }, [getToken])

  const editStudent = useCallback(async (payload) => {
    const token = await getToken()
    const res = await fetch('/api/students', { method:'PATCH', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify(payload) })
    const data = JSON.parse(await res.text())
    if (!res.ok) throw new Error(data.error||'Failed to update student')
    setStudents(prev => prev.map(s => s.id===data.student.id ? data.student : s))
    return data.student
  }, [getToken])

  const deleteStudent = useCallback(async (studentId) => {
    const token = await getToken()
    const res = await fetch('/api/delete-student', { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify({id:studentId}) })
    const data = JSON.parse(await res.text())
    if (!res.ok) throw new Error(data.error||'Failed to delete student')
    setStudents(prev => prev.filter(s => s.id!==studentId))
  }, [getToken])

  return { students, loading, error, refetch: fetchStudents, addStudent, editStudent, deleteStudent }
}
