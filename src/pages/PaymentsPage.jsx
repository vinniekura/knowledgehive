import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { formatMoney, formatDate } from '../lib/utils.js'
import { CreditCard, Copy, ExternalLink, CheckCircle } from 'lucide-react'

const STATUS_COLORS = {
  paid:    'bg-teal-100 text-teal-800',
  pending: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-700',
  waived:  'bg-slate-100 text-slate-500',
}

// PayID settings — pull from env or tutor settings
const PAYID = import.meta.env.VITE_PAYID || 'your-payid@knowledgehive.com.au'
const BSB   = import.meta.env.VITE_BSB || ''
const ACCT  = import.meta.env.VITE_ACCOUNT_NUMBER || ''

export default function PaymentsPage() {
  const { getToken } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  useEffect(() => {
    getToken().then(token =>
      fetch('/api/invoices', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.text())
        .then(t => { try { const d = JSON.parse(t); setInvoices(d.invoices || []) } catch {} })
        .catch(console.error)
        .finally(() => setLoading(false))
    )
  }, [getToken])

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const paid        = invoices.filter(i => i.status === 'paid')
  const outstanding = invoices.filter(i => i.status !== 'paid')
  const totalCollected   = paid.reduce((s, i) => s + (i.amountAud || 0), 0)
  const totalOutstanding = outstanding.reduce((s, i) => s + (i.amountAud || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
        <button className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-2xl font-bold text-slate-900">{formatMoney(totalCollected)}</div>
          <div className="text-xs text-slate-400 mt-1">Total Collected</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-2xl font-bold text-amber-600">{formatMoney(totalOutstanding)}</div>
          <div className="text-xs text-slate-400 mt-1">Outstanding</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-2xl font-bold text-slate-900">{invoices.length}</div>
          <div className="text-xs text-slate-400 mt-1">Total Invoices</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-2xl font-bold text-teal-600">
            {invoices.length ? Math.round((paid.length / invoices.length) * 100) : 0}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Collection Rate</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">

        {/* Invoices table — 2/3 width */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">All Invoices</h3>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-slate-400">Loading…</div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center">
                <CreditCard size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No invoices yet — wrap a session to generate one</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Student','Amount','Date','Status','Pay'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{inv.studentName}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatMoney(inv.amountAud)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(inv.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status] || 'bg-slate-100 text-slate-500'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {inv.status !== 'paid' ? (
                          <div className="flex items-center gap-2">
                            {/* Stripe payment link */}
                            {inv.stripePaymentLinkUrl && (
                              <a href={inv.stripePaymentLinkUrl} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white transition-all"
                                style={{ background: '#635bff' }}>
                                <ExternalLink size={11} /> Stripe
                              </a>
                            )}
                            {/* PayID button */}
                            <button onClick={() => setSelectedInvoice(inv)}
                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                              <CreditCard size={11} /> PayID
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-teal-600 font-semibold">
                            <CheckCircle size={12} /> {inv.paidAt ? formatDate(inv.paidAt) : 'Paid'}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right sidebar — payment methods */}
        <div className="space-y-4">

          {/* Stripe */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#635bff' }}>
                <CreditCard size={14} className="text-white" />
              </div>
              <div className="text-sm font-semibold text-slate-800">Stripe</div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Payment links are automatically generated when you wrap a session. Parent clicks the link and pays by card in 30 seconds.
            </p>
            <div className="text-xs text-teal-600 font-semibold">
              {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? '✓ Connected' : '⚠ Add Stripe key to enable'}
            </div>
          </div>

          {/* PayID */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <span className="text-xs font-bold text-amber-700">$</span>
              </div>
              <div className="text-sm font-semibold text-slate-800">PayID / Bank Transfer</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">PayID</div>
                  <div className="text-xs font-semibold text-slate-700">{PAYID}</div>
                </div>
                <button onClick={() => copyToClipboard(PAYID, 'payid')}
                  className="text-slate-400 hover:text-teal-600 transition-colors">
                  {copied === 'payid' ? <CheckCircle size={14} className="text-teal-500" /> : <Copy size={14} />}
                </button>
              </div>
              {BSB && (
                <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">BSB</div>
                    <div className="text-xs font-semibold text-slate-700">{BSB}</div>
                  </div>
                  <button onClick={() => copyToClipboard(BSB, 'bsb')}
                    className="text-slate-400 hover:text-teal-600 transition-colors">
                    {copied === 'bsb' ? <CheckCircle size={14} className="text-teal-500" /> : <Copy size={14} />}
                  </button>
                </div>
              )}
              {ACCT && (
                <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Account</div>
                    <div className="text-xs font-semibold text-slate-700">{ACCT}</div>
                  </div>
                  <button onClick={() => copyToClipboard(ACCT, 'acct')}
                    className="text-slate-400 hover:text-teal-600 transition-colors">
                    {copied === 'acct' ? <CheckCircle size={14} className="text-teal-500" /> : <Copy size={14} />}
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Add <code className="bg-slate-100 px-1 rounded">VITE_PAYID</code>, <code className="bg-slate-100 px-1 rounded">VITE_BSB</code> and <code className="bg-slate-100 px-1 rounded">VITE_ACCOUNT_NUMBER</code> to Vercel env vars.
            </p>
          </div>

        </div>
      </div>

      {/* PayID detail modal — shows when clicking PayID on an invoice */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">PayID Payment Details</h3>
            <p className="text-sm text-slate-500 mb-4">
              {selectedInvoice.studentName} · {formatMoney(selectedInvoice.amountAud)}
            </p>

            <div className="bg-amber-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">Amount to pay</div>
                  <div className="text-2xl font-bold text-amber-900">{formatMoney(selectedInvoice.amountAud)}</div>
                </div>
              </div>
              <div className="border-t border-amber-200 pt-3 space-y-2">
                <PayIDRow label="PayID" value={PAYID} onCopy={() => copyToClipboard(PAYID, 'modal-payid')} copied={copied === 'modal-payid'} />
                {BSB && <PayIDRow label="BSB" value={BSB} onCopy={() => copyToClipboard(BSB, 'modal-bsb')} copied={copied === 'modal-bsb'} />}
                {ACCT && <PayIDRow label="Account" value={ACCT} onCopy={() => copyToClipboard(ACCT, 'modal-acct')} copied={copied === 'modal-acct'} />}
                <PayIDRow
                  label="Reference"
                  value={`${selectedInvoice.studentName.split(' ')[0]} tuition`}
                  onCopy={() => copyToClipboard(`${selectedInvoice.studentName.split(' ')[0]} tuition`, 'modal-ref')}
                  copied={copied === 'modal-ref'} />
              </div>
            </div>

            <button onClick={() => setSelectedInvoice(null)}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PayIDRow({ label, value, onCopy, copied }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-amber-700 opacity-70">{label}</div>
        <div className="text-sm font-semibold text-amber-900">{value}</div>
      </div>
      <button onClick={onCopy} className="text-amber-600 hover:text-amber-800 transition-colors ml-3">
        {copied ? <CheckCircle size={16} className="text-teal-500" /> : <Copy size={16} />}
      </button>
    </div>
  )
}
