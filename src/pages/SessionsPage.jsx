import { useState } from 'react'
import { useSessions } from '../hooks/useSessions.js'
import { useStudents } from '../hooks/useStudents.js'
import SessionWrapModal from '../components/sessions/SessionWrapModal.jsx'
import ScheduleSessionModal from '../components/sessions/ScheduleSessionModal.jsx'
import { formatDate, formatMoney } from '../lib/utils.js'
import { CalendarDays } from 'lucide-react'

const PAY_COLORS = {
  paid:    'bg-teal-100 text-teal-800',
  pending: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-700',
}

export default function SessionsPage() {
  const { sessions, loading, wrapSession, createSession } = useSessions()
  const { students } = useStudents()
  const [wrapTarget, setWrapTarget] = useState(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = sessions
    .filter(s => s.status === 'scheduled' && s.scheduledDate >= today)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime))
  const past = sessions
    .filter(s => s.status !== 'scheduled' || s.scheduledDate < today)
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))

  async function handleWrap(payload) {
    const result = await wrapSession(payload)
    showToast('Session wrapped. Summary + payment link sent ✓')
    setWrapTarget(null)
    return result
  }

  async function handleSchedule(data) {
    await createSession(data)
    showToast('Session scheduled ✓')
    setShowSchedule(false)
  }

  function openWrap(sess) {
    const student = students.find(s => s.id === sess.studentId)
    setWrapTarget({ session: sess, student })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Sessions</h1>
        <button onClick={() => setShowSchedule(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: 'var(--honey)', color: 'var(--navy)' }}>
          <CalendarDays size={14} /> + Schedule Session
        </button>
      </div>

      <div className="space-y-4">
        {/* Upcoming */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Upcoming
              <span className="ml-2 text-xs font-normal text-slate-400">({upcoming.length})</span>
            </h3>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-slate-400">Loading…</div>
          ) : upcoming.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarDays size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No upcoming sessions</p>
              <button onClick={() => setShowSchedule(true)}
                className="mt-2 text-xs font-semibold text-teal-600 hover:underline">
                Schedule one →
              </button>
            </div>
          ) : (
            upcoming.map(sess => (
              <div key={sess.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className={`text-center rounded-lg px-2.5 py-2 min-w-14 flex-shrink-0 ${sess.scheduledDate === today ? 'bg-teal-600' : 'bg-slate-800'} text-white`}>
                  <div className="text-xs opacity-50 uppercase">{new Date(sess.scheduledDate + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' })}</div>
                  <div className="text-base font-bold">{new Date(sess.scheduledDate + 'T00:00:00').getDate()}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{sess.studentName} — {sess.subject}</div>
                  <div className="text-xs text-slate-400">{sess.scheduledTime} · {sess.durationMins}min · {formatMoney(sess.rateAud || 0)}</div>
                </div>
                <button onClick={() => openWrap(sess)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                  style={{ background: 'var(--honey)', color: 'var(--navy)' }}>
                  Wrap ✓
                </button>
              </div>
            ))
          )}
        </div>

        {/* Past */}
        {past.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">
                History
                <span className="ml-2 text-xs font-normal text-slate-400">({past.length})</span>
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Date','Student','Subject','Duration','Payment',''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {past.map(sess => (
                  <tr key={sess.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(sess.scheduledDate)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{sess.studentName}</td>
                    <td className="px-4 py-3 text-slate-500">{sess.subject}</td>
                    <td className="px-4 py-3 text-slate-500">{sess.durationMins}min</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PAY_COLORS[sess.paymentStatus] || 'bg-slate-100 text-slate-500'}`}>
                        {sess.paymentStatus || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sess.stripePaymentLinkUrl && sess.paymentStatus !== 'paid' && (
                        <a href={sess.stripePaymentLinkUrl} target="_blank" rel="noreferrer"
                          className="text-xs text-teal-600 font-semibold hover:underline">
                          Pay link ↗
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showSchedule && (
        <ScheduleSessionModal
          students={students.filter(s => s.status === 'active')}
          onClose={() => setShowSchedule(false)}
          onSave={handleSchedule}
        />
      )}
      {wrapTarget && (
        <SessionWrapModal
          session={wrapTarget.session}
          student={wrapTarget.student}
          onClose={() => setWrapTarget(null)}
          onWrap={handleWrap}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
