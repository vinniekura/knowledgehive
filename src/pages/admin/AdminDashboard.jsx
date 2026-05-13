import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { formatMoney } from '../../lib/utils.js'
import { Users, DollarSign, TrendingUp, Plus, Settings, CreditCard, Shield, Copy, CheckCircle, Pencil } from 'lucide-react'
import EditTutorModal from './EditTutorModal.jsx'
import TutorPaymentEditor from './TutorPaymentEditor.jsx'

export default function AdminDashboard() {
  const { getToken } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tutors')
  const [showAddTutor, setShowAddTutor] = useState(false)
  const [editTutor, setEditTutor] = useState(null)
  const [paymentTutor, setPaymentTutor] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 4000) }
  const load = () => getToken().then(token =>
    fetch('/api/admin?action=stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setStats(d); setLoading(false) }).catch(() => setLoading(false))
  )
  useEffect(() => { load() }, [])

  const tc = a => `px-4 py-2 text-sm font-semibold rounded-lg transition-all ${a ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'}`
  const statCards = [
    { label: 'Active Tutors', value: stats?.activeTutors||0, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Total Students', value: stats?.totalStudents||0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Platform Revenue', value: formatMoney(stats?.totalRevenue||0), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Fees Earned', value: formatMoney(stats?.totalFees||0), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
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
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}><Icon size={16} className={color} /></div>
            <div className="text-2xl font-bold text-slate-900">{loading ? '—' : value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('tutors')} className={tc(tab==='tutors')}>Tutors</button>
        <button onClick={() => setTab('bank')} className={tc(tab==='bank')}><span className="flex items-center gap-1.5"><CreditCard size={13}/> Bank Settings</span></button>
        <button onClick={() => setTab('admins')} className={tc(tab==='admins')}><span className="flex items-center gap-1.5"><Shield size={13}/> Admin Access</span></button>
        <button onClick={() => setTab('platform')} className={tc(tab==='platform')}><span className="flex items-center gap-1.5"><Settings size={13}/> Platform</span></button>
      </div>

      {/* TUTORS TAB */}
      {tab === 'tutors' && (
        <div>
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-4">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">All Tutors</h3>
              <span className="text-xs text-slate-400">{stats?.tutors?.length||0} registered</span>
            </div>
            {loading ? <div className="p-8 text-center text-sm text-slate-400">Loading…</div> :
             !stats?.tutors?.length ? <div className="p-8 text-center text-sm text-slate-400">No tutors yet</div> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Tutor','Subjects','Students','Sessions','Fee','Payment','Status',''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.tutors.map(t => (
                    <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{t.firstName} {t.lastName}</div>
                        <div className="text-xs text-slate-400">{t.email}</div>
                        {t.businessName && <div className="text-xs text-slate-400">{t.businessName}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{(t.subjects||[]).join(', ')||'—'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{t.totalStudents||0}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{t.totalSessions||0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.feePercent===0?'bg-teal-100 text-teal-800':'bg-amber-100 text-amber-800'}`}>
                          {t.feePercent===0?'Free (beta)':`${t.feePercent}%`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {t.paymentConfig?.method==='payid'?'PayID':t.paymentConfig?.method==='stripe'?'Stripe':t.paymentConfig?.method==='both'?'Both':'Platform'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.status==='active'?'bg-teal-100 text-teal-800':'bg-red-100 text-red-700'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditTutor(t)}
                            className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-800 px-2 py-1 rounded-lg hover:bg-teal-50 transition-all">
                            <Pencil size={12}/> Edit
                          </button>
                          <button onClick={() => setPaymentTutor(t)}
                            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-all">
                            <CreditCard size={12}/> Payment
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Payment editor panel — shows below table when tutor selected */}
          {paymentTutor && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Payment Settings — {paymentTutor.firstName} {paymentTutor.lastName}
                </h3>
                <button onClick={() => setPaymentTutor(null)} className="text-xs text-slate-400 hover:text-slate-600">✕ Close</button>
              </div>
              <TutorPaymentEditor
                tutor={paymentTutor}
                getToken={getToken}
                onSaved={msg => { showToast(msg); setPaymentTutor(null); load() }}
              />
            </div>
          )}
        </div>
      )}

      {/* BANK SETTINGS TAB */}
      {tab === 'bank' && (
        <BankSettings getToken={getToken} initial={stats?.bankSettings} onSaved={msg => { showToast(msg); load() }} />
      )}

      {/* ADMIN ACCESS TAB */}
      {tab === 'admins' && <AdminAccess getToken={getToken} onSaved={showToast} />}

      {/* PLATFORM TAB */}
      {tab === 'platform' && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Platform Settings</h3>
          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Default Fee for New Tutors (%)</label>
            <PlatformFeeEditor getToken={getToken} onSaved={showToast} />
            <p className="text-xs text-slate-400 mt-1.5">Set to 0 for free onboarding. Change to e.g. 2 when monetising.</p>
          </div>
        </div>
      )}

      {showAddTutor && (
        <AddTutorModal getToken={getToken} onClose={() => setShowAddTutor(false)}
          onSaved={msg => { showToast(msg); setShowAddTutor(false); load() }} />
      )}

      {editTutor && (
        <EditTutorModal
          tutor={editTutor}
          getToken={getToken}
          onClose={() => setEditTutor(null)}
          onSaved={msg => { showToast(msg); setEditTutor(null); load() }}
          onDeleted={msg => { showToast(msg); setEditTutor(null); load() }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl z-50 max-w-sm">{toast}</div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BankSettings({ getToken, initial, onSaved }) {
  const [form, setForm] = useState({ accountName:initial?.accountName||'', bank:initial?.bank||'', bsb:initial?.bsb||'', accountNumber:initial?.accountNumber||'', payId:initial?.payId||'' })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(null)
  function copy(val, key) { navigator.clipboard.writeText(val); setCopied(key); setTimeout(()=>setCopied(null),2000) }
  async function save() {
    setSaving(true)
    const token = await getToken()
    const res = await fetch('/api/admin?action=bank-settings', { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify(form) })
    setSaving(false)
    if (res.ok) onSaved('Bank settings saved ✓'); else { const d=await res.json(); alert(d.error) }
  }
  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors'
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Platform Bank Account</h3>
        <p className="text-xs text-slate-400 mb-4">Default payment details shown in parent emails when no tutor-specific payment is configured</p>
        <div className="space-y-3">
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Account Name</label><input className={inp} value={form.accountName} onChange={e=>setForm({...form,accountName:e.target.value})} placeholder="H2K Group Pty Ltd" /></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Bank</label><input className={inp} value={form.bank} onChange={e=>setForm({...form,bank:e.target.value})} placeholder="Commonwealth Bank" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">BSB</label><input className={inp} value={form.bsb} onChange={e=>setForm({...form,bsb:e.target.value})} placeholder="062-000" /></div>
            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Account Number</label><input className={inp} value={form.accountNumber} onChange={e=>setForm({...form,accountNumber:e.target.value})} placeholder="12345678" /></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">PayID (mobile, email or ABN)</label><input className={inp} value={form.payId} onChange={e=>setForm({...form,payId:e.target.value})} placeholder="payments@datamastery.com.au or 0412 345 678" /></div>
          <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{background:'var(--teal)'}}>{saving?'Saving…':'Save Bank Settings'}</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Quick Copy</h3>
        <p className="text-xs text-slate-400 mb-4">Copy to share or paste into emails</p>
        {form.payId||form.bsb ? (
          <div className="space-y-3">
            {[{label:'Account Name',val:form.accountName,key:'name'},{label:'Bank',val:form.bank,key:'bank'},{label:'BSB',val:form.bsb,key:'bsb'},{label:'Account Number',val:form.accountNumber,key:'acct'},{label:'PayID',val:form.payId,key:'payid'}].filter(r=>r.val).map(({label,val,key})=>(
              <div key={key} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5">
                <div><div className="text-xs text-slate-400">{label}</div><div className="text-sm font-semibold text-slate-800">{val}</div></div>
                <button onClick={()=>copy(val,key)} className="text-slate-400 hover:text-teal-600 transition-colors ml-3">{copied===key?<CheckCircle size={16} className="text-teal-500"/>:<Copy size={16}/>}</button>
              </div>
            ))}
          </div>
        ) : <div className="text-sm text-slate-400 text-center py-8">Fill in bank details to see quick copy</div>}
      </div>
    </div>
  )
}

function AdminAccess({ getToken, onSaved }) {
  const [email, setEmail] = useState('')
  const [newRole, setNewRole] = useState('ops')
  const [saving, setSaving] = useState(false)
  const [admins, setAdmins] = useState([])
  useEffect(() => { getToken().then(token => fetch('/api/admin?action=list-admins', { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json()).then(d=>setAdmins(d.admins||[])).catch(()=>{})) }, [getToken])
  async function addAdmin() {
    if (!email) return; setSaving(true)
    const token = await getToken()
    const res = await fetch('/api/admin?action=add-admin', { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify({ email, newRole }) })
    const data = await res.json(); setSaving(false)
    if (res.ok) { onSaved(data.pending?`${email} will get ${newRole} access on next sign-in ✓`:`${email} is now ${newRole} admin ✓`); setEmail('') }
    else alert(data.error)
  }
  const inp = 'border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors'
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Add Admin Access</h3>
        <p className="text-xs text-slate-400 mb-4">Grant admin access by email. Access is granted on next sign-in if not yet registered.</p>
        <div className="space-y-3">
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email Address</label><input className={`${inp} w-full`} value={email} onChange={e=>setEmail(e.target.value)} placeholder="tutor@email.com" type="email"/></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Role</label>
            <select className={`${inp} w-full`} value={newRole} onChange={e=>setNewRole(e.target.value)}>
              <option value="ops">Operations Admin — add tutors, view all data</option>
              <option value="super">Super Admin — full access including fees</option>
            </select>
          </div>
          <button onClick={addAdmin} disabled={saving||!email} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{background:'var(--teal)'}}>{saving?'Adding…':'Grant Admin Access'}</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Current Admins</h3>
        {admins.length===0 ? <p className="text-sm text-slate-400">Loading…</p> : (
          <div className="space-y-2">
            {admins.map((a,i)=>(
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5">
                <div><div className="text-xs font-semibold text-slate-700 truncate max-w-48">{a.userId}</div><div className="text-xs text-slate-400">{a.addedAt?new Date(a.addedAt).toLocaleDateString('en-AU'):'—'}</div></div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${a.role==='super'?'bg-purple-100 text-purple-800':'bg-teal-100 text-teal-800'}`}>{a.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PlatformFeeEditor({ getToken, onSaved }) {
  const [fee, setFee] = useState(0); const [saving, setSaving] = useState(false)
  async function save() { setSaving(true); const token=await getToken(); await fetch('/api/admin?action=platform-settings',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({onboardingFeePercent:parseFloat(fee)})}); setSaving(false); onSaved(`Platform default fee set to ${fee}%`) }
  return <div className="flex items-center gap-2"><input type="number" value={fee} onChange={e=>setFee(e.target.value)} className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" min="0" max="20" step="0.5"/><span className="text-sm text-slate-400">%</span><button onClick={save} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{background:'var(--teal)'}}>{saving?'…':'Save'}</button></div>
}

function AddTutorModal({ getToken, onClose, onSaved }) {
  const [form, setForm] = useState({firstName:'',lastName:'',email:'',businessName:'',subjects:'',feePercent:0}); const [saving,setSaving]=useState(false)
  async function save() {
    setSaving(true); const token=await getToken()
    const res=await fetch('/api/admin?action=tutors',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({...form,subjects:form.subjects.split(',').map(s=>s.trim()).filter(Boolean)})})
    const data=await res.json(); setSaving(false)
    if(res.ok) onSaved(`${form.firstName} ${form.lastName} added ✓`); else alert(data.error)
  }
  const inp='w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-teal-400'
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Tutor</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">First Name</label><input className={inp} value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></div>
            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Last Name</label><input className={inp} value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</label><input type="email" className={inp} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Business Name</label><input className={inp} value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})}/></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Subjects (comma separated)</label><input className={inp} value={form.subjects} onChange={e=>setForm({...form,subjects:e.target.value})} placeholder="Maths, Physics"/></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Platform Fee %</label><input type="number" className={inp} value={form.feePercent} onChange={e=>setForm({...form,feePercent:e.target.value})} min="0" max="20" step="0.5"/></div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{background:'var(--teal)'}}>{saving?'Adding…':'Add & Send Welcome Email'}</button>
        </div>
      </div>
    </div>
  )
}
