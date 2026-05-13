import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { X, Save } from 'lucide-react'

const SUBJECTS = ['Specialist Mathematics','Mathematics','Physics','Chemistry','Biology','Literature / English','Economics','Computing','Other']
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const TIMES = ['7:00 AM','8:00 AM','9:00 AM','10:00 AM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','7:00 PM']

export default function EditStudentModal({ student, onClose, onSave }) {
  const [saving, setSaving] = useState(false)
  const [selectedDays, setSelectedDays] = useState(student.preferredDays || [])

  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      parentName: student.parentName,
      parentEmail: student.parentEmail,
      parentMobile: student.parentMobile || '',
      subject: student.subject,
      yearLevel: student.yearLevel || 'Year 12',
      sessionType: student.sessionType || '1on1_online',
      preferredTime: student.preferredTime || '3:00 PM',
      learningGoals: student.learningGoals || '',
      ratePerSession: student.ratePerSession ? (student.ratePerSession / 100).toFixed(0) : 110,
      sessionDurationMins: student.sessionDurationMins || 90,
      billTo: student.billTo || 'parent',
    }
  })

  function toggleDay(day) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d=>d!==day) : [...prev, day])
  }

  async function onSubmit(data) {
    setSaving(true)
    try {
      await onSave({ ...data, studentId: student.id, preferredDays: selectedDays })
      onClose()
    } catch(err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors'

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Edit Student</h2>
            <p className="text-xs text-slate-400 mt-0.5">{student.firstName} {student.lastName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-4">

            {/* Profile */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Profile</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">First Name</label><input {...register('firstName')} className={inp} /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Last Name</label><input {...register('lastName')} className={inp} /></div>
              </div>
              <div className="mt-3"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Student Email</label><input {...register('email')} type="email" className={inp} /></div>
              <div className="mt-3"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Parent Name</label><input {...register('parentName')} className={inp} /></div>
              <div className="mt-3"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Parent Email</label><input {...register('parentEmail')} type="email" className={inp} /></div>
              <div className="mt-3"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Parent Mobile</label><input {...register('parentMobile')} type="tel" className={inp} /></div>
            </div>

            {/* Enrolment */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Enrolment</h3>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Subject</label>
                <select {...register('subject')} className={inp}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Year Level</label>
                  <select {...register('yearLevel')} className={inp}>{['Year 12','Year 11','Year 10','Year 9','Tertiary','Professional'].map(y=><option key={y}>{y}</option>)}</select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Session Type</label>
                  <select {...register('sessionType')} className={inp}>
                    <option value="1on1_online">1:1 Online</option>
                    <option value="1on1_inperson">1:1 In-person</option>
                    <option value="group">Group</option>
                  </select>
                </div>
              </div>

              {/* Preferred days */}
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Preferred Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button key={day} type="button" onClick={()=>toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                        ${selectedDays.includes(day) ? 'bg-teal-100 text-teal-800 border-teal-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {day.slice(0,3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Preferred Time</label>
                <select {...register('preferredTime')} className={inp}>{TIMES.map(t=><option key={t}>{t}</option>)}</select>
              </div>
              <div className="mt-3"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Learning Goals</label>
                <textarea {...register('learningGoals')} className={`${inp} min-h-16 resize-none`} />
              </div>
            </div>

            {/* Session & Rate */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Session & Rate</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Rate per Session ($)</label>
                  <input {...register('ratePerSession')} type="number" min="0" step="5" className={inp} />
                </div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Duration</label>
                  <select {...register('sessionDurationMins')} className={inp}>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </div>
              </div>
              <div className="mt-3"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Invoice To</label>
                <select {...register('billTo')} className={inp}>
                  <option value="parent">Parent / Guardian</option>
                  <option value="student">Student (self-paying)</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
            </div>

          </div>

          <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{background:'var(--teal)'}}>
              <Save size={14}/>{saving?'Saving…':'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
