import { useState } from 'react'
import { useStudents } from '../hooks/useStudents.js'
import { useSessions } from '../hooks/useSessions.js'
import AddStudentWizard from '../components/students/AddStudentWizard.jsx'
import SessionWrapModal from '../components/sessions/SessionWrapModal.jsx'
import { formatMoney, formatDate } from '../lib/utils.js'

export default function DashboardPage() {
  const { students, loading: sLoading, addStudent } = useStudents()
  const { sessions, loading: ssLoading, wrapSession } = useSessions()
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [wrapTarget, setWrapTarget] = useState(null) // { session, student }
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const todaySessions = sessions.filter(s => s.scheduledDate === new Date().toISOString().slice(0,10) && s.status === 'scheduled')
  const pendingInvoices = sessions.filter(s => s.paymentStatus === 'pending' || s.paymentStatus === 'overdue')
  const activeStudents = students.filter(s => s.status === 'active')
  const monthRevenue = sessions
    .filter(s => s.paymentStatus === 'paid' && s.completedAt?.startsWith(new Date().toISOString().slice(0,7)))
    .reduce((sum, s) => sum + (s.rateAud || 0), 0)

  async function handleWrap(payload) {
    const result = await wrapSession(payload)
    showToast(`Session summary + payment link sent to parent ✓`)
    setWrapTarget(null)
    return result
  }

  async function handleAddStudent(data) {
    await addStudent(data)
    showToast('Student added. Welcome email sent ✓')
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">{new Date().toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddStudent(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: 'var(--honey)', color: 'var(--navy)' }}>
            + Add Student
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { val: activeStudents.length, lbl: 'Active Students', delta: 'growing' },
          { val: todaySessions.length,  lbl: 'Sessions Today',  delta: 'next soon' },
          { val: formatMoney(monthRevenue), lbl: 'Collected This Month', delta: 'this month' },
          { val: pendingInvoices.length, lbl: 'Unpaid Invoices', delta: 'outstanding', warn: pendingInvoices.length > 0 },
        ].map(({ val, lbl, delta, warn }) => (
          <div key={lbl} className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="text-2xl font-bold text-slate-900">{val}</div>
            <div className="text-xs text-slate-400 mt-1">{lbl}</div>
            <div className={`text-xs mt-1.5 font-semibold ${warn ? 'text-amber-600' : 'text-teal-600'}`}>{delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Today's sessions */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Today's Sessions</h3>
          {ssLoading ? <p className="text-sm text-slate-400">Loading…</p> :
           todaySessions.length === 0 ? <p className="text-sm text-slate-400">No sessions scheduled today</p> :
           todaySessions.map(sess => {
             const student = students.find(s => s.id === sess.studentId)
             return (
               <div key={sess.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-2 border border-slate-100">
                 <div className="text-center bg-slate-800 text-white rounded-lg px-2 py-1.5 min-w-12">
                   <div className="text-xs opacity-50">NOW</div>
                   <div className="text-sm font-bold">{sess.scheduledTime}</div>
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="text-sm font-semibold text-slate-800 truncate">
                     {sess.studentName} — {sess.subject}
                   </div>
                   <div className="text-xs text-slate-400">{sess.durationMins}min · {formatMoney(student?.ratePerSession || 0)}</div>
                 </div>
                 <button onClick={() => setWrapTarget({ session: sess, student })}
                   className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-900 transition-all"
                   style={{ background: 'var(--honey)' }}>
                   Wrap ✓
                 </button>
               </div>
             )
           })
          }
          {todaySessions.length === 0 && !ssLoading && (
            <p className="text-sm text-slate-400 mt-2">Schedule a session to get started →</p>
          )}
        </div>

        {/* Recent activity / quick actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => setShowAddStudent(true)}
                className="w-full text-left text-sm font-medium px-3 py-2.5 rounded-lg transition-all"
                style={{ background: 'var(--honey)', color: 'var(--navy)' }}>
                + Add New Student
              </button>
              <button className="w-full text-left text-sm font-medium px-3 py-2.5 rounded-lg bg-slate-800 text-white transition-all">
                📝 Wrap a Session
              </button>
              <button className="w-full text-left text-sm font-medium px-3 py-2.5 rounded-lg border border-slate-200 text-slate-600 transition-all hover:bg-slate-50">
                📅 Schedule Session
              </button>
              <button className="w-full text-left text-sm font-medium px-3 py-2.5 rounded-lg border border-slate-200 text-slate-600 transition-all hover:bg-slate-50">
                💳 View Payments
              </button>
            </div>
          </div>

          {pendingInvoices.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Unpaid Invoices</h3>
              {pendingInvoices.slice(0,3).map(sess => {
                const student = students.find(s => s.id === sess.studentId)
                return (
                  <div key={sess.id} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-700 truncate">{sess.studentName}</div>
                      <div className="text-xs text-slate-400">{formatDate(sess.scheduledDate)}</div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                      ${sess.paymentStatus === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {sess.paymentStatus}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {formatMoney(student?.ratePerSession || 0)}
                    </span>
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
