import { useState } from 'react'
import { useStudents } from '../hooks/useStudents.js'
import { useSessions } from '../hooks/useSessions.js'
import AddStudentWizard from '../components/students/AddStudentWizard.jsx'
import SessionWrapModal from '../components/sessions/SessionWrapModal.jsx'
import ScheduleSessionModal from '../components/sessions/ScheduleSessionModal.jsx'
import { formatMoney, formatDate } from '../lib/utils.js'
import { CalendarDays, UserPlus, CreditCard, ClipboardList } from 'lucide-react'

export default function DashboardPage() {
  const { students, loading: sLoading, addStudent } = useStudents()
  const { sessions, loading: ssLoading, wrapSession, createSession } = useSessions()
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [wrapTarget, setWrapTarget] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const today = new Date().toISOString().slice(0, 10)
  const todaySessions = sessions.filter(s => s.scheduledDate === today && s.status === 'scheduled')
  const upcomingSessions = sessions.filter(s => s.scheduledDate > today && s.status === 'scheduled')
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
  const pendingInvoices = sessions.filter(s => s.paymentStatus === 'pending' && s.status === 'completed')
  const activeStudents = students.filter(s => s.status === 'active')
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthRevenue = sessions
    .filter(s => s.paymentStatus === 'paid' && s.completedAt?.startsWith(thisMonth))
    .reduce((sum, s) => sum + (s.rateAud || 0), 0)

  async function handleWrap(payload) {
    const result = await wrapSession(payload)
    showToast('Session wrapped. Summary + payment link sent to parent ✓')
    setWrapTarget(null)
    return result
  }

  async function handleSchedule(data) {
    await createSession(data)
    showToast('Session scheduled ✓')
  }

  async function handleAddStudent(data) {
    await addStudent(data)
    showToast('Student added. Welcome email sent ✓')
  }

  function openWrap(sess) {
    const student = students.find(s => s.id === sess.studentId)
    setWrapTarget({ session: sess, student })
  }

  const statCls = 'bg-white rounded-xl border border-slate-100 p-4'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSchedule(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            <CalendarDays size={14} /> Schedule
          </button>
          <button onClick={() => setShowAddStudent(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: 'var(--honey)', color: 'var(--navy)' }}>
            <UserPlus size={14} /> Add Student
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className={statCls}>
          <div className="text-2xl font-bold text-slate-900">{activeStudents.length}</div>
          <div className="text-xs text-slate-400 mt-1">Active Students</div>
          <div className="text-xs mt-1.5 font-semibold text-teal-600">
            {todaySessions.length > 0 ? `${todaySessions.length} session${todaySessions.length > 1 ? 's' : ''} today` : 'growing'}
          </div>
        </div>
        <div className={statCls}>
          <div className="text-2xl font-bold text-slate-900">{todaySessions.length + upcomingSessions.length}</div>
          <div className="text-xs text-slate-400 mt-1">Upcoming Sessions</div>
          <div className="text-xs mt-1.5 font-semibold text-teal-600">
            {todaySessions.length > 0 ? `${todaySessions.length} today` : upcomingSessions.length > 0 ? 'next soon' : 'none scheduled'}
          </div>
        </div>
        <div className={statCls}>
          <div className="text-2xl font-bold text-slate-900">{formatMoney(monthRevenue)}</div>
          <div className="text-xs text-slate-400 mt-1">Collected This Month</div>
          <div className="text-xs mt-1.5 font-semibold text-teal-600">this month</div>
        </div>
        <div className={statCls}>
          <div className="text-2xl font-bold text-slate-900">{pendingInvoices.length}</div>
          <div className="text-xs text-slate-400 mt-1">Unpaid Invoices</div>
          <div className={`text-xs mt-1.5 font-semibold ${pendingInvoices.length > 0 ? 'text-amber-600' : 'text-teal-600'}`}>
            {pendingInvoices.length > 0 ? 'outstanding' : 'all clear ✓'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">

          {/* Today's sessions */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Today's Sessions
                {todaySessions.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {todaySessions.length} scheduled
                  </span>
                )}
              </h3>
              <button onClick={() => setShowSchedule(true)}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                + Schedule
              </button>
            </div>

            {ssLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : todaySessions.length === 0 ? (
              <div className="text-center py-4">
                <CalendarDays size={24} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No sessions today</p>
                <button onClick={() => setShowSchedule(true)}
                  className="mt-2 text-xs font-semibold text-teal-600 hover:underline">
                  Schedule one →
                </button>
              </div>
            ) : (
              todaySessions.map(sess => (
                <SessionRow key={sess.id} sess={sess} onWrap={() => openWrap(sess)} isToday />
              ))
            )}
          </div>

          {/* Upcoming */}
          {upcomingSessions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Upcoming</h3>
              {upcomingSessions.slice(0, 4).map(sess => (
                <SessionRow key={sess.id} sess={sess} onWrap={() => openWrap(sess)} />
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Outstanding payments */}
          {pendingInvoices.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Unpaid Invoices</h3>
                <button className="text-xs font-semibold text-amber-600 hover:text-amber-700">
                  Send Reminders
                </button>
              </div>
              {pendingInvoices.slice(0, 4).map(sess => {
                const student = students.find(s => s.id === sess.studentId)
                return (
                  <div key={sess.id} className="flex items-center gap-2 py-2.5 border-b border-slate-50 last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <CreditCard size={13} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-700 truncate">{sess.studentName}</div>
                      <div className="text-xs text-slate-400">{formatDate(sess.scheduledDate)}</div>
                    </div>
                    <span className="text-xs font-bold text-amber-700">
                      {formatMoney(student?.ratePerSession || 0)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <QuickBtn icon={<CalendarDays size={14} />} label="Schedule a Session"
                onClick={() => setShowSchedule(true)} primary />
              <QuickBtn icon={<UserPlus size={14} />} label="Add New Student"
                onClick={() => setShowAddStudent(true)} />
              <QuickBtn icon={<ClipboardList size={14} />} label="Wrap Today's Session"
                onClick={() => todaySessions[0] && openWrap(todaySessions[0])} />
              <QuickBtn icon={<CreditCard size={14} />} label="View All Payments"
                onClick={() => {}} />
            </div>
          </div>

          {/* Recent students */}
          {activeStudents.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Recent Students</h3>
              {activeStudents.slice(0, 4).map((s, i) => {
                const colors = ['bg-blue-100 text-blue-800','bg-teal-100 text-teal-800','bg-amber-100 text-amber-800','bg-rose-100 text-rose-800']
                return (
                  <div key={s.id} className="flex items-center gap-2.5 py-2 border-b border-slate-50 last:border-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colors[i % colors.length]}`}>
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{s.firstName} {s.lastName}</div>
                      <div className="text-xs text-slate-400">{s.subject}</div>
                    </div>
                    <div className="text-xs text-slate-400">{s.totalSessions} sessions</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddStudent && (
        <AddStudentWizard onClose={() => setShowAddStudent(false)} onSave={handleAddStudent} />
      )}
      {showSchedule && (
        <ScheduleSessionModal
          students={activeStudents}
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl z-50 max-w-sm">
          {toast}
        </div>
      )}
    </div>
  )
}

function SessionRow({ sess, onWrap, isToday }) {
  const dateLabel = isToday ? sess.scheduledTime : new Date(sess.scheduledDate).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-2 last:mb-0 border border-slate-100">
      <div className={`text-center rounded-lg px-2 py-1.5 min-w-14 flex-shrink-0 ${isToday ? 'bg-teal-600 text-white' : 'bg-slate-700 text-white'}`}>
        <div className="text-xs opacity-60 uppercase tracking-wide">{isToday ? 'Today' : new Date(sess.scheduledDate).toLocaleDateString('en-AU', { weekday: 'short' })}</div>
        <div className="text-sm font-bold">{isToday ? sess.scheduledTime : new Date(sess.scheduledDate).getDate()}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800 truncate">{sess.studentName} — {sess.subject}</div>
        <div className="text-xs text-slate-400">{sess.durationMins}min · {sess.sessionType?.replace('1on1_', '1:1 ') || '1:1'}</div>
      </div>
      <button onClick={onWrap}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-all"
        style={{ background: 'var(--honey)', color: 'var(--navy)' }}>
        Wrap ✓
      </button>
    </div>
  )
}

function QuickBtn({ icon, label, onClick, primary }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 text-sm font-medium px-3 py-2.5 rounded-lg transition-all text-left
        ${primary ? 'text-slate-900' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
      style={primary ? { background: 'var(--honey)' } : {}}>
      {icon} {label}
    </button>
  )
}
