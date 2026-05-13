import { useState } from 'react'
import { Save, CreditCard, Building2, ToggleLeft, ToggleRight } from 'lucide-react'

export default function TutorPaymentEditor({ tutor, getToken, onSaved }) {
  const cfg = tutor.paymentConfig || {}
  const [method, setMethod] = useState(cfg.method || 'platform')
  const [stripeLink, setStripeLink] = useState(cfg.stripePaymentLink || '')
  const [payId, setPayId] = useState(cfg.payId || '')
  const [bsb, setBsb] = useState(cfg.bsb || '')
  const [accountNumber, setAccountNumber] = useState(cfg.accountNumber || '')
  const [accountName, setAccountName] = useState(cfg.accountName || '')
  const [allowEdit, setAllowEdit] = useState(cfg.allowTutorEdit || false)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const token = await getToken()
    const res = await fetch('/api/admin?action=tutor-payment', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tutorId: tutor.id,
        paymentConfig: { method, stripePaymentLink: stripeLink, payId, bsb, accountNumber, accountName, allowTutorEdit: allowEdit }
      })
    })
    setSaving(false)
    if (res.ok) onSaved(`Payment settings saved for ${tutor.firstName} ✓`)
    else { const d = await res.json(); alert(d.error) }
  }

  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors'
  const methodBtn = (val, label, icon) => (
    <button type="button" onClick={() => setMethod(val)}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition-all
        ${method === val ? 'bg-teal-100 text-teal-800 border-teal-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}>
      {icon}{label}
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Method selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Payment Method</label>
        <div className="flex gap-2">
          {methodBtn('platform', 'Platform Default', <Building2 size={14}/>)}
          {methodBtn('payid', 'PayID / Bank', <CreditCard size={14}/>)}
          {methodBtn('stripe', 'Stripe Link', <CreditCard size={14}/>)}
          {methodBtn('both', 'Both', <CreditCard size={14}/>)}
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          {method==='platform' && 'Uses the platform bank details set in Bank Settings tab'}
          {method==='payid' && 'Shows tutor-specific PayID/bank details in parent emails'}
          {method==='stripe' && 'Shows a Stripe payment link in parent emails'}
          {method==='both' && 'Shows both Stripe link AND PayID details in parent emails'}
        </p>
      </div>

      {/* PayID / Bank fields */}
      {(method==='payid'||method==='both') && (
        <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-200">
          <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">Tutor Bank / PayID Details</div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Account Name</label><input className={inp} value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="Hemish Kura Tutoring" /></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">PayID (mobile, email, or ABN)</label><input className={inp} value={payId} onChange={e=>setPayId(e.target.value)} placeholder="0412 345 678 or hemish@email.com or 12 345 678 901" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">BSB</label><input className={inp} value={bsb} onChange={e=>setBsb(e.target.value)} placeholder="062-000" /></div>
            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Account Number</label><input className={inp} value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} placeholder="12345678" /></div>
          </div>
        </div>
      )}

      {/* Stripe link field */}
      {(method==='stripe'||method==='both') && (
        <div className="bg-purple-50 rounded-xl p-4 space-y-3 border border-purple-200">
          <div className="text-xs font-bold text-purple-800 uppercase tracking-wide">Stripe Payment Link</div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Stripe Payment Link URL</label>
            <input className={inp} value={stripeLink} onChange={e=>setStripeLink(e.target.value)} placeholder="https://buy.stripe.com/..." />
            <p className="text-xs text-slate-400 mt-1">Create a Payment Link in Stripe Dashboard → Payment Links → Create. Use a variable amount link.</p>
          </div>
        </div>
      )}

      {/* Allow tutor to edit toggle */}
      <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
        <div>
          <div className="text-sm font-semibold text-slate-700">Allow tutor to edit their payment details</div>
          <div className="text-xs text-slate-400 mt-0.5">If on, tutor sees a settings page to update their own PayID/bank details</div>
        </div>
        <button type="button" onClick={() => setAllowEdit(!allowEdit)} className={`transition-colors ${allowEdit ? 'text-teal-600' : 'text-slate-400'}`}>
          {allowEdit ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
        </button>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
        style={{background:'var(--teal)'}}>
        <Save size={14}/>{saving?'Saving…':'Save Payment Settings'}
      </button>
    </div>
  )
}
