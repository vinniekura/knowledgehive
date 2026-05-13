import { useState } from 'react'
import { useStudents } from '../hooks/useStudents.js'
import AddStudentWizard from '../components/students/AddStudentWizard.jsx'
import EditStudentModal from '../components/students/EditStudentModal.jsx'
import { initials, formatDate, formatMoney } from '../lib/utils.js'
import { Search, Trash2, UserPlus, Pencil } from 'lucide-react'

const SOURCE_COLORS = { direct:'bg-purple-100 text-purple-800', corporate:'bg-blue-100 text-blue-800', school:'bg-green-100 text-green-800', social:'bg-pink-100 text-pink-800', other:'bg-slate-100 text-slate-600' }
const AVATAR_COLORS = ['bg-blue-100 text-blue-800','bg-teal-100 text-teal-800','bg-amber-100 text-amber-800','bg-rose-100 text-rose-800','bg-purple-100 text-purple-800']

export default function StudentsPage() {
  const { students, loading, addStudent, editStudent, deleteStudent } = useStudents()
  const [showWizard, setShowWizard] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null),4000) }

  const filtered = students.filter(s =>
    `${s.firstName} ${s.lastName} ${s.email} ${s.subject} ${s.companyName||''}`.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave(data) { await addStudent(data); setShowWizard(false); showToast('Student added ✓') }
  async function handleEdit(data) { await editStudent(data); setEditTarget(null); showToast('Student updated ✓') }
  async function handleDelete(student) {
    setDeleting(true)
    try { await deleteStudent(student.id); setConfirmDelete(null); showToast(`${student.firstName} removed ✓`) }
    catch(err) { alert(err.message) } finally { setDeleting(false) }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Students <span className="text-base font-normal text-slate-400">({students.length})</span></h1>
        <button onClick={()=>setShowWizard(true)} className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-sm font-semibold" style={{background:'var(--honey)',color:'var(--navy)'}}>
          <UserPlus size={14}/> <span className="hidden sm:inline">Add Student</span><span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search students…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-teal-400 transition-colors"/>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <p className="text-slate-400 text-sm">{students.length===0?'No students yet — add your first one!':'No students match your search'}</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((s,i) => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${AVATAR_COLORS[i%AVATAR_COLORS.length]}`}>
                  {initials(`${s.firstName} ${s.lastName}`)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm">{s.firstName} {s.lastName}</div>
                  <div className="text-xs text-slate-400 truncate">{s.subject} · {formatMoney(s.ratePerSession||0)}/session</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${SOURCE_COLORS[s.source]||SOURCE_COLORS.other}`}>{s.source}</span>
                    <span className="text-xs text-slate-400">{s.totalSessions||0} sessions</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={()=>setEditTarget(s)} className="p-2 text-slate-400 hover:text-teal-600 transition-colors"><Pencil size={15}/></button>
                  <button onClick={()=>setConfirmDelete(s)} className="p-2 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={15}/></button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Student','Subject','Source','Sessions','Last Session','Rate',''].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s,i) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[i%AVATAR_COLORS.length]}`}>{initials(`${s.firstName} ${s.lastName}`)}</div>
                        <div><div className="font-semibold text-slate-800">{s.firstName} {s.lastName}</div><div className="text-xs text-slate-400">{s.parentEmail||s.email}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.subject}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SOURCE_COLORS[s.source]||SOURCE_COLORS.other}`}>{s.source}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{s.totalSessions||0}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{s.lastSessionDate?formatDate(s.lastSessionDate):'—'}</td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">{formatMoney(s.ratePerSession||0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>setEditTarget(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50"><Pencil size={14}/></button>
                        <button onClick={()=>setConfirmDelete(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove student?</h3>
            <p className="text-sm text-slate-500 mb-5"><strong>{confirmDelete.firstName} {confirmDelete.lastName}</strong> will be removed. Session history is kept.</p>
            <div className="flex gap-3">
              <button onClick={()=>setConfirmDelete(null)} className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600">Cancel</button>
              <button onClick={()=>handleDelete(confirmDelete)} disabled={deleting} className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-red-500 text-white disabled:opacity-50">{deleting?'Removing…':'Remove'}</button>
            </div>
          </div>
        </div>
      )}

      {showWizard && <AddStudentWizard onClose={()=>setShowWizard(false)} onSave={handleSave}/>}
      {editTarget && <EditStudentModal student={editTarget} onClose={()=>setEditTarget(null)} onSave={handleEdit}/>}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl z-50 whitespace-nowrap">{toast}</div>}
    </div>
  )
}
