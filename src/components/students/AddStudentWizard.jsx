import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'

const STEPS = ['Profile', 'Enrolment', 'Payment']

const SUBJECTS = ['Specialist Mathematics','Physics','Chemistry','Literature / English','Biology','Economics','Other']
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const TIMES = ['3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','9:00 AM','10:00 AM']

export default function AddStudentWizard({ onClose, onSave }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      source: 'direct',
      ratePerSession: 110,
      sessionDurationMins: 90,
      billTo: 'parent',
      paymentMethod: 'stripe',
      autoReminder48h: true,
      sendSummaryToParent: true,
      sendWelcomeEmail: true,
    }
  })

  const source = watch('source')

  const onSubmit = async (data) => {
    if (step < 2) { setStep(s => s + 1); return }
    setSaving(true)
    try {
      await onSave(data)
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Add Student</h2>
            <p className="text-xs text-slate-400 mt-0.5">Step {step + 1} of 3 — {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center px-6 mb-5 gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${i < step ? 'bg-teal-500 text-white' : i === step ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-400'}`}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${i === step ? 'text-slate-700' : 'text-slate-400'}`}>{s}</span>
              {i < 2 && <div className="flex-1 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pb-6">

            {/* ── STEP 1: Profile ── */}
            {step === 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name" error={errors.firstName}>
                    <input {...register('firstName', { required: true })} className={input()} placeholder="James" />
                  </Field>
                  <Field label="Last Name" error={errors.lastName}>
                    <input {...register('lastName', { required: true })} className={input()} placeholder="Kovacs" />
                  </Field>
                </div>
                <Field label="Student Email">
                  <input {...register('email')} type="email" className={input()} placeholder="james@email.com" />
                </Field>
                <Field label="Parent / Guardian Name" error={errors.parentName}>
                  <input {...register('parentName', { required: true })} className={input()} placeholder="Margaret Kovacs" />
                </Field>
                <Field label="Parent Email — payment links sent here" error={errors.parentEmail}>
                  <input {...register('parentEmail', { required: true })} type="email" className={input()} placeholder="margaret@email.com" />
                </Field>
                <Field label="Parent Mobile (SMS reminders)">
                  <input {...register('parentMobile')} type="tel" className={input()} placeholder="+61 4xx xxx xxx" />
                </Field>
                <Field label="How did they find you?">
                  <select {...register('source')} className={input()}>
                    <option value="direct">Direct — parent / student self-referred</option>
                    <option value="corporate">Corporate client enrolment</option>
                    <option value="school">School referral</option>
                    <option value="social">Social media</option>
                    <option value="other">Other / word of mouth</option>
                  </select>
                </Field>
                {source === 'corporate' && (
                  <>
                    <Field label="Company / Organisation">
                      <input {...register('companyName')} className={input()} placeholder="e.g. Deloitte, KPMG" />
                    </Field>
                    <Field label="HR / L&D Contact Email">
                      <input {...register('hrContactEmail')} type="email" className={input()} placeholder="hr@company.com.au" />
                    </Field>
                  </>
                )}
              </div>
            )}

            {/* ── STEP 2: Enrolment ── */}
            {step === 1 && (
              <div className="space-y-3">
                <Field label="Subject / Course">
                  <select {...register('subject')} className={input()}>
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Year / Level">
                    <select {...register('yearLevel')} className={input()}>
                      {['Year 12','Year 11','Year 10','Tertiary','Professional'].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </Field>
                  <Field label="Session Type">
                    <select {...register('sessionType')} className={input()}>
                      <option value="1on1_online">1:1 Online</option>
                      <option value="1on1_inperson">1:1 In-person</option>
                      <option value="group">Group</option>
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Preferred Day">
                    <select {...register('preferredDay')} className={input()}>
                      {DAYS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </Field>
                  <Field label="Preferred Time">
                    <select {...register('preferredTime')} className={input()}>
                      {TIMES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Learning Goals (shown in every session summary)">
                  <textarea {...register('learningGoals')} className={`${input()} min-h-20 resize-none`}
                    placeholder="e.g. Improve exam technique for complex number proofs. Target 90+ in the final." />
                </Field>
              </div>
            )}

            {/* ── STEP 3: Payment ── */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rate per Session ($AUD)">
                    <input {...register('ratePerSession')} type="number" min="0" step="5" className={input()} />
                  </Field>
                  <Field label="Session Length">
                    <select {...register('sessionDurationMins')} className={input()}>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>120 min</option>
                    </select>
                  </Field>
                </div>
                <Field label="Invoice / Bill To">
                  <select {...register('billTo')} className={input()}>
                    <option value="parent">Parent / Guardian</option>
                    <option value="student">Student (self-paying)</option>
                    <option value="corporate">Corporate — monthly invoice</option>
                  </select>
                </Field>
                <Field label="Payment Method">
                  <select {...register('paymentMethod')} className={input()}>
                    <option value="stripe">Stripe — card payment link</option>
                    <option value="payid">PayID / Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="corporate_invoice">Corporate Invoice (30-day)</option>
                  </select>
                </Field>
                <div className="space-y-2 pt-1">
                  <CheckRow register={register} name="autoReminder48h" label="Auto-send payment reminder 48h after session if unpaid" />
                  <CheckRow register={register} name="sendSummaryToParent" label="Email session summary + payment link to parent after every session" />
                  <CheckRow register={register} name="sendWelcomeEmail" label="Send welcome email to student & parent on save" />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between mt-5 pt-4 border-t border-slate-100">
              {step > 0
                ? <button type="button" onClick={() => setStep(s => s - 1)}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium">
                    <ChevronLeft size={16} /> Back
                  </button>
                : <div />
              }
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: step < 2 ? 'var(--honey)' : 'var(--teal)', color: step < 2 ? 'var(--navy)' : '#fff' }}>
                {saving ? 'Saving…' : step < 2 ? <>Next: {STEPS[step + 1]} <ChevronRight size={15} /></> : '✓ Save & Send Welcome Email'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">Required</p>}
    </div>
  )
}

function CheckRow({ register, name, label }) {
  return (
    <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
      <input type="checkbox" {...register(name)} className="accent-teal-500 w-4 h-4" />
      <span className="text-sm text-slate-600">{label}</span>
    </label>
  )
}

const input = () => 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors'
