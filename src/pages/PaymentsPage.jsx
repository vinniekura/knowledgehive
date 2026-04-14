import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { formatMoney, formatDate } from '../lib/utils.js'

const STATUS_COLORS = {
  paid:    'bg-teal-100 text-teal-800',
  pending: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-700',
  waived:  'bg-slate-100 text-slate-500',
}

export default function PaymentsPage() {
  const { getToken } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getToken().then(token =>
      fetch('/api/invoices', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { setInvoices(d.invoices || []); setLoading(false) })
        .catch(() => setLoading(false))
    )
  }, [getToken])

  const paid    = invoices.filter(i => i.status === 'paid')
  const pending = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
  const totalCollected = paid.reduce((s, i) => s + i.amountAud, 0)
  const totalOutstanding = pending.reduce((s, i) => s + i.amountAud, 0)

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

      {/* Invoices table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">All Invoices</h3>
        </div>
        {loading ? <div className="p-6 text-sm text-slate-400">Loading…</div> :
         invoices.length === 0 ? (
           <div className="p-8 text-center">
             <p className="text-sm text-slate-400">No invoices yet — wrap a session to generate the first one</p>
           </div>
         ) : (
           <table className="w-full text-sm">
             <thead><tr className="border-b border-slate-100">
               {['Invoice','Student','Amount','Date','Status',''].map(h =>
                 <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
               )}
             </tr></thead>
             <tbody>
               {invoices.map((inv, i) => (
                 <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                   <td className="px-4 py-3 text-slate-400 text-xs">#{String(i+1).padStart(3,'0')}</td>
                   <td className="px-4 py-3 font-medium text-slate-800">{inv.studentName}</td>
                   <td className="px-4 py-3 font-semibold text-slate-800">{formatMoney(inv.amountAud)}</td>
                   <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(inv.createdAt)}</td>
                   <td className="px-4 py-3">
                     <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status] || 'bg-slate-100 text-slate-500'}`}>
                       {inv.status}
                     </span>
                   </td>
                   <td className="px-4 py-3">
                     {inv.stripePaymentLinkUrl && inv.status !== 'paid' ? (
                       <a href={inv.stripePaymentLinkUrl} target="_blank" rel="noreferrer"
                         className="text-xs bg-teal-500 text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-teal-600">
                         Send Link
                       </a>
                     ) : inv.status === 'paid' ? (
                       <span className="text-xs text-slate-400">Paid {formatDate(inv.paidAt)}</span>
                     ) : null}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         )
        }
      </div>
    </div>
  )
}
