import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { X, Save, Trash2 } from 'lucide-react'

const SUBJECTS = ['Specialist Mathematics','Mathematics','Physics','Chemistry','Biology','Literature / English','Economics','Computing','Other']

export default function EditTutorModal({ tutor, getToken, onClose, onSaved, onDeleted }) {
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState(tutor.subjects || [])

  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: tutor.firstName,
      lastName: tutor.lastName,
      email: tutor.email,
      businessName: tutor.businessName || '',
      abn: tutor.abn || '',
      feePercent: tutor.feePercent ?? 0,
    }
  })

  function toggleSubject(s) {
    setSelectedSubjects(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev, s])
  }

  async function onSubmit(data) {
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-tutor-actions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', tutorId: tutor.id, updates: { ...data, subjects: selectedSubjects, feePercent: parseFloat(data.feePercent) } })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      onSaved(`${data.firstName} ${data.lastName} updated ✓`)
      onClose()
    } catch(err) { alert(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-tutor-actions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', tutorId: tutor.id })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      onDeleted(`${tutor.firstName} ${tutor.lastName} removed ✓`)
      onClose()
    } catch(err) { alert(err.message) }
    finally { setDeleting(false) }
  }

  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors'

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Edit Tutor</h2>
            <p className="text-xs text-slate-400 mt-0.5">{tutor.firstName} {tutor.lastName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        {confirming ? (
          <div className="p-6">
            <div className="bg-red-50 rounded-xl p-4 border border-red-200 mb-4">
              <h3 className="text-base font-semibold text-red-900 mb-1">Remove this tutor?</h3>
              <p className="text-sm text-red-700">
                <strong>{tutor.firstName} {tutor.lastName}</strong> ({tutor.email}) will be deactivated.
                Their student and session history is kept.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirming(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white disabled:opacity-50">
                {deleting ? 'Removing…' : 'Yes, Remove Tutor'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">First Name</label><input {...register('firstName')} className={inp}/></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Last Name</label><input {...register('lastName')} className={inp}/></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</label><input {...register('email')} type="email" className={inp}/></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Business Name</label><input {...register('businessName')} className={inp}/></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ABN</label><input {...register('abn')} className={inp} placeholder="12 345 678 901"/></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Platform Fee %</label><input {...register('feePercent')} type="number" min="0" max="20" step="0.5" className={inp}/></div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Subjects</label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map(s => (
                    <button key={s} type="button" onClick={() => toggleSubject(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all
                        ${selectedSubjects.includes(s) ? 'bg-teal-100 text-teal-800 border-teal-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-6 pb-6 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setConfirming(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50">
                <Trash2 size={14}/> Remove
              </button>
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{background:'var(--teal)'}}>
                <Save size={14}/>{saving?'Saving…':'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
