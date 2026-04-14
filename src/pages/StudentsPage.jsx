import { useState } from 'react'
import { useStudents } from '../hooks/useStudents.js'
import AddStudentWizard from '../components/students/AddStudentWizard.jsx'
import { initials, formatDate, formatMoney } from '../lib/utils.js'
import { Search } from 'lucide-react'

const STATUS_COLORS = {
  paid:     'bg-teal-100 text-teal-800',
  pending:  'bg-amber-100 text-amber-800',
  overdue:  'bg-red-100 text-red-700',
}
const SOURCE_COLORS = {
  direct:    'bg-purple-100 text-purple-800',
  corporate: 'bg-blue-100 text-blue-800',
  school:    'bg-green-100 text-green-800',
  social:    'bg-pink-100 text-pink-800',
  other:     'bg-slate-100 text-slate-600',
}
const AVATAR_COLORS = ['bg-blue-100 text-blue-800','bg-teal-100 text-teal-800','bg-amber-100 text-amber-800','bg-rose-100 text-rose-800','bg-purple-100 text-purple-800']

export default function StudentsPage() {
  const { students, loading, addStudent } = useStudents()
  const [showWizard, setShowWizard] = useState(false)
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState('all')
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const filtered = students.filter(s => {
    const matchSearch = `${s.firstName} ${s.lastName} ${s.email} ${s.subject}`.toLowerCase().includes(search.toLowerCase())
    const matchSource = filterSource === 'all' || s.source === filterSource
    return matchSearch && matchSource
  })

  async function handleSave(data) {
    await addStudent(data)
    setShowWizard(false)
    showToast('Student added. Welcome email sent ✓')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Students</h1>
        <button onClick={() => setShowWizard(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--honey)', color: 'var(--navy)' }}>
          + Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search students…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-teal-400" />
        </div>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-teal-400">
          <option value="all">All sources</option>
          <option value="direct">Direct</option>
          <option value="corporate">Corporate</option>
          <option value="school">School</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading students…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400 text-sm">
              {students.length === 0 ? 'No students yet — add your first one!' : 'No students match your search'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Student','Subject','Source','Sessions','Last Session','Rate','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                        {initials(`${s.firstName} ${s.lastName}`)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{s.firstName} {s.lastName}</div>
                        <div className="text-xs text-slate-400">{s.parentEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SOURCE_COLORS[s.source] || SOURCE_COLORS.other}`}>
                      {s.source}
                    </span>
                    {s.companyName && <div className="text-xs text-slate-400 mt-0.5">{s.companyName}</div>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{s.totalSessions}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{s.lastSessionDate ? formatDate(s.lastSessionDate) : '—'}</td>
                  <td className="px-4 py-3 text-slate-700 font-semibold">{formatMoney(s.ratePerSession)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showWizard && <AddStudentWizard onClose={() => setShowWizard(false)} onSave={handleSave} />}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl z-50">{toast}</div>
      )}
    </div>
  )
}
