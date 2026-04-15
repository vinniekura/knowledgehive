import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { X, CalendarDays } from 'lucide-react'

const TIMES = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00',
]

function formatTimeLabel(t) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${display}:${m} ${ampm}`
}

// Get next 14 days as date options
function getDateOptions() {
  const options = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short'
    })
    options.push({ value: iso, label: i === 0 ? `Today — ${label}` : i === 1 ? `Tomorrow — ${label}` : label })
  }
  return options
}

export default function ScheduleSessionModal({ students, onClose, onSave }) {
  const [saving, setSaving] = useState(false)
  const dateOptions = getDateOptions()

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      scheduledDate: dateOptions[0].value,
      scheduledTime: '15:00',
      durationMins: 90,
    }
  })

  const selectedStudentId = watch('studentId')
  const selectedStudent = students.find(s => s.id === selectedStudentId)

  async function onSubmit(data) {
    setSaving(true)
    try {
      await onSave({
        studentId: data.studentId,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        durationMins: parseInt(data.durationMins),
        subject: data.subject || selectedStudent?.subject,
      })
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors'

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'var(--honey-l)' }}>
              <CalendarDays size={18} style={{ color: 'var(--honey-d)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Schedule Session</h2>
              <p className="text-xs text-slate-400 mt-0.5">Pick a student, date and time</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pb-6 space-y-4">

            {/* Student */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Student *
              </label>
              {students.length === 0 ? (
                <div className="text-sm text-slate-400 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-200">
                  No students yet — add one first
                </div>
              ) : (
                <select {...register('studentId', { required: true })} className={inputCls}>
                  <option value="">Select a student…</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} — {s.subject}
                    </option>
                  ))}
                </select>
              )}
              {errors.studentId && <p className="text-xs text-red-500 mt-1">Please select a student</p>}
            </div>

            {/* Subject — auto-fills from student but editable */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Subject
              </label>
              <input
                {...register('subject')}
                className={inputCls}
                placeholder={selectedStudent?.subject || 'e.g. Specialist Mathematics'}
                defaultValue={selectedStudent?.subject || ''}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Date *
              </label>
              <select {...register('scheduledDate', { required: true })} className={inputCls}>
                {dateOptions.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Time + Duration side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Start Time *
                </label>
                <select {...register('scheduledTime', { required: true })} className={inputCls}>
                  {TIMES.map(t => (
                    <option key={t} value={t}>{formatTimeLabel(t)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Duration
                </label>
                <select {...register('durationMins')} className={inputCls}>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                  <option value={120}>120 min</option>
                </select>
              </div>
            </div>

            {/* Student summary card */}
            {selectedStudent && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-800 flex-shrink-0">
                    {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </div>
                    <div className="text-xs text-slate-400">
                      {selectedStudent.preferredDay} {selectedStudent.preferredTime} · ${(selectedStudent.ratePerSession / 100).toFixed(0)}/session
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <button type="button" onClick={onClose}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium px-3 py-2">
                Cancel
              </button>
              <button type="submit" disabled={saving || students.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-slate-900 transition-all disabled:opacity-40"
                style={{ background: 'var(--honey)' }}>
                <CalendarDays size={14} />
                {saving ? 'Scheduling…' : 'Schedule Session'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
