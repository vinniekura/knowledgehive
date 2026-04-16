import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { formatMoney } from '../../lib/utils.js'
import { Users, CalendarDays, DollarSign, TrendingUp, Plus, Settings } from 'lucide-react'

export default function AdminDashboard() {
  const { getToken } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddTutor, setShowAddTutor] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  useEffect(() => {
    getToken().then(token =>
      fetch('/api/admin?action=stats', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { setStats(d); setLoading(false) })
        .catch(() => setLoading(false))
    )
  }, [getToken])

  const statCards = [
    { label: 'Active Tutors', value: stats?.activeTutors || 0, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Total Students', value: stats?.totalStudents || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Platform Revenue', value: formatMoney(stats?.totalRevenue || 0), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Platform Fees Earned', value: formatMoney(stats?.totalFees || 0), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Portal</h1>
          <p className="text-sm text-slate-400 mt-0.5">TutorMastery Platform — H2K Group</p>
        </div>
        <button onClick={() => setShowAddTutor(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--honey)', color: 'var(--navy)' }}>
          <Plus size={14} /> Add Tutor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={16} className={color} />
            </div>
            <div className="text-2xl font-bold text-slate-900">{loading ? '—' : value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Tutors table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">All Tutors</h3>
          <span className="text-xs text-slate-400">{stats?.tutors?.length || 0} registered</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
        ) : !stats?.tutors?.length ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-400">No tutors yet — add the first one</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Tutor','Subjects','Students','Sessions','Platform Fee','Payment','Status',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.tutors.map(t => (
                <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{t.firstName} {t.lastName}</div>
                    <div className="text-xs text-slate-400">{t.email}</div>
                    {t.businessName && <div className="text-xs text-slate-400">{t.businessName}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{(t.subjects||[]).join(', ') || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{t.totalStudents || 0}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{t.totalSessions || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.feePercent === 0 ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>
                      {t.feePercent === 0 ? 'Free (beta)' : `${t.feePercent}%`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {t.paymentMethod === 'platform' ? 'Platform' : t.paymentMethod === 'stripe' ? 'Own Stripe' : 'PayID'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.status === 'active' ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-700'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <TutorFeeEditor tutor={t} getToken={getToken} onSaved={showToast} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Platform settings card */}
      <PlatformSettings getToken={getToken} onSaved={showToast} />

      {showAddTutor && (
        <AddTutorModal getToken={getToken} onClose={() => setShowAddTutor(false)}
          onSaved={msg => { showToast(msg); setShowAddTutor(false) }} />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

function TutorFeeEditor({ tutor, getToken, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [fee, setFee] = useState(tutor.feePercent)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const token = await getToken()
    await fetch('/api/admin?action=tutor-settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tutorId: tutor.id, feePercent: parseFloat(fee) }),
    })
    setSaving(false)
    setEditing(false)
    onSaved(`Fee updated to ${fee}% for ${tutor.firstName}`)
  }

  if (!editing) return (
    <button onClick={() => setEditing(true)} className="text-xs text-teal-600 hover:underline font-semibold">
      Edit fee
    </button>
  )

  return (
    <div className="flex items-center gap-1">
      <input type="number" value={fee} onChange={e => setFee(e.target.value)}
        className="w-14 border border-slate-200 rounded px-1.5 py-1 text-xs" min="0" max="20" step="0.5" />
      <span className="text-xs text-slate-400">%</span>
      <button onClick={save} disabled={saving}
        className="text-xs bg-teal-500 text-white px-2 py-1 rounded font-semibold">
        {saving ? '…' : '✓'}
      </button>
      <button onClick={() => setEditing(false)} className="text-xs text-slate-400">✕</button>
    </div>
  )
}

function PlatformSettings({ getToken, onSaved }) {
  const [fee, setFee] = useState(0)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const token = await getToken()
    await fetch('/api/admin?action=platform-settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboardingFeePercent: parseFloat(fee) }),
    })
    setSaving(false)
    onSaved(`Platform default fee set to ${fee}%`)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Settings size={16} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-800">Platform Settings</h3>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Default Fee for New Tutors (%)
          </label>
          <div className="flex items-center gap-2">
            <input type="number" value={fee} onChange={e => setFee(e.target.value)}
              className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
              min="0" max="20" step="0.5" />
            <span className="text-sm text-slate-400">%</span>
            <button onClick={save} disabled={saving}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: 'var(--teal)' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">Set to 0 for free onboarding period</p>
        </div>
      </div>
    </div>
  )
}

function AddTutorModal({ getToken, onClose, onSaved }) {
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', businessName:'', subjects:'', feePercent:0 })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const token = await getToken()
    const res = await fetch('/api/admin?action=tutors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, subjects: form.subjects.split(',').map(s => s.trim()).filter(Boolean) }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) onSaved(`${form.firstName} ${form.lastName} added as tutor ✓`)
    else alert(data.error)
  }

  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-teal-400'

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Tutor</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">First Name</label>
              <input className={inp} value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} /></div>
            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Last Name</label>
              <input className={inp} value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</label>
            <input type="email" className={inp} value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Business Name (optional)</label>
            <input className={inp} value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} placeholder={`${form.firstName} ${form.lastName} Tutoring`} /></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Subjects (comma separated)</label>
            <input className={inp} value={form.subjects} onChange={e => setForm({...form, subjects: e.target.value})} placeholder="Maths, Physics, Chemistry" /></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Platform Fee %</label>
            <input type="number" className={inp} value={form.feePercent} onChange={e => setForm({...form, feePercent: e.target.value})} min="0" max="20" step="0.5" />
            <p className="text-xs text-slate-400 mt-1">0 = free onboarding period</p></div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--teal)' }}>
            {saving ? 'Adding…' : 'Add & Send Welcome Email'}
          </button>
        </div>
      </div>
    </div>
  )
}
