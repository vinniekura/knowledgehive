import { useState } from 'react'

const SUBJECTS = ['Specialist Mathematics','Mathematics','Physics','Chemistry','Biology','Literature / English','Economics','History','Geography','Computing','Other']

export default function JoinPage() {
  const [step, setStep] = useState(1) // 1=form, 2=success
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', mobile:'',
    businessName:'', bio:'', subjects:[]
  })
  const [error, setError] = useState(null)

  function toggleSubject(s) {
    setForm(f => ({
      ...f,
      subjects: f.subjects.includes(s) ? f.subjects.filter(x => x !== s) : [...f.subjects, s]
    }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.email) { setError('Please fill in all required fields'); return }
    if (form.subjects.length === 0) { setError('Please select at least one subject'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors'

  if (step === 2) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--navy)' }}>
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--honey-l)' }}>
          <span className="text-3xl">🎉</span>
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">You're in!</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          Welcome to TutorMastery, {form.firstName}! Check your email — we've sent you a sign-in link.
          Once you're in, complete your settings to start adding students.
        </p>
        <a href="https://tutormastery.datamastery.com.au"
          className="inline-block px-6 py-3 rounded-xl text-sm font-semibold text-slate-900 transition-all"
          style={{ background: 'var(--honey)' }}>
          Sign in now →
        </a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--navy)' }}>
      {/* Header */}
      <div className="text-center pt-12 pb-8 px-6">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl"
               style={{ background: 'var(--honey)', color: 'var(--navy)', fontFamily: 'var(--fd)' }}>K</div>
          <span className="text-white text-xl font-semibold">KnowledgeHive</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Join as a Tutor</h1>
        <p className="text-white/60 text-sm max-w-sm mx-auto">
          Set up your tutoring business in minutes. Add students, schedule sessions, and get paid automatically.
        </p>
      </div>

      {/* Form card */}
      <div className="max-w-lg mx-auto px-4 pb-12">
        <form onSubmit={submit} className="bg-white rounded-2xl p-8 shadow-2xl space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">First Name *</label>
              <input className={inp} value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="Hemish" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Last Name *</label>
              <input className={inp} value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Kura" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email Address *</label>
            <input type="email" className={inp} value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="hemish@email.com" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mobile</label>
            <input type="tel" className={inp} value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} placeholder="+61 4xx xxx xxx" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Business / Trading Name</label>
            <input className={inp} value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} placeholder="e.g. Hemish Kura Mathematics Tutoring" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Subjects You Teach *</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(s => (
                <button key={s} type="button" onClick={() => toggleSubject(s)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all
                    ${form.subjects.includes(s)
                      ? 'bg-teal-100 text-teal-800 border-teal-300'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Brief Bio <span className="font-normal text-slate-400">(shown on your profile page)</span>
            </label>
            <textarea className={`${inp} min-h-20 resize-none`} value={form.bio}
              onChange={e => setForm({...form, bio: e.target.value})}
              placeholder="e.g. Year 12 Maths and Science specialist. 5 years experience. ATAR 99." />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--honey)', color: 'var(--navy)' }}>
            {saving ? 'Registering…' : 'Register as Tutor →'}
          </button>

          <p className="text-xs text-slate-400 text-center">
            Already registered? <a href="https://tutormastery.datamastery.com.au" className="text-teal-600 font-semibold hover:underline">Sign in here</a>
          </p>
        </form>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {['Free to start', 'Auto payment links', 'Parent emails built-in'].map(b => (
            <div key={b} className="bg-white/10 rounded-xl px-3 py-3 text-center">
              <div className="text-white text-xs font-semibold">{b}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
