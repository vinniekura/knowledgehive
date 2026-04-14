// api/sessions/index.js
// GET  /api/sessions  — list all sessions for tutor
// POST /api/sessions  — schedule a new session

import { getAuth } from '@clerk/express'
import { getJson, setJson, addToIndex, getIndex, keys } from '../../src/lib/redis.js'
import { generateId } from '../../src/lib/utils.js'

export default async function handler(req, res) {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  if (req.method === 'GET') {
    const ids = await getIndex(keys.tutorSessions(userId))
    const sessions = await Promise.all(ids.map(id => getJson(keys.session(id))))
    return res.json({ sessions: sessions.filter(Boolean) })
  }

  if (req.method === 'POST') {
    const { studentId, scheduledDate, scheduledTime, durationMins, subject, sessionType } = req.body
    const student = await getJson(keys.student(studentId))
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const sessionId = generateId('ses')
    const session = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      tutorId: userId,
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      scheduledDate,
      scheduledTime: scheduledTime || '15:00',
      durationMins: durationMins || student.sessionDurationMins || 90,
      subject: subject || student.subject,
      sessionType: sessionType || student.sessionType,
      status: 'scheduled',
      topicsCovered: [],
      needsMoreWork: [],
      homeworkSet: [],
      notesForParent: '',
      privateTutorNotes: '',
      rateAud: student.ratePerSession,
      paymentStatus: 'pending',
    }

    await setJson(keys.session(sessionId), session)
    await addToIndex(keys.tutorSessions(userId), sessionId, new Date(scheduledDate).getTime())
    await addToIndex(keys.studentSessions(studentId), sessionId)

    return res.status(201).json({ session })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
