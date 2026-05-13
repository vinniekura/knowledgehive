import { useState } from 'react'
import { X, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { formatMoney } from '../../lib/utils.js'

const TOPICS = ['Complex number proofs','Argand diagrams','De Moivre\'s theorem','Integration review','Vectors','Proof by induction','Differential equations','Mechanics','Waves & optics','Essay structure','Close reading','Critical analysis','Algebra','Trigonometry','Statistics','Calculus']
const WORK_ON = ['Integration by substitution','Proof structure','Exam timing','Working clearly','Show all steps','Interpretation','Time management','Algebra skills','Word problems']
const HOMEWORK = ['Practice paper Q1–Q8','Textbook exercises','Review notes','Past exam paper','Rewrite draft','Khan Academy videos','Worksheet set','Finish problem set']

export default function SessionWrapModal({ session, student, onClose, onWrap }) {
  const [covered, setCovered] = useState([])
  const [needsWork, setNeedsWork] = useState([])
  const [homework, setHomework] = useState([])
  const [notesForParent, setNotesForParent] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  function toggle(arr, setArr, val) {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  async function handleSend() {
    setSaving(true)
    try {
      await onWrap({ sessionId: session.id, topicsCovered: covered, needsMoreWork: needsWork, homeworkSet: homework, notesForParent, privateTutorNotes: '', sendEmailNow: true })
      setDone(true)
      setTimeout(onClose, 2000)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const amount = formatMoney(student?.ratePerSession || 11000)

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-end sm:items-center justify-center z-50">
      {/* Bottom sheet on mobile, centered modal on desktop */}
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[95vh] overflow-y-auto shadow-2xl">

        {/* Handle bar — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Wrap Session</h2>
            <p className="text-xs text-slate-400 mt-0.5">{student?.firstName} {student?.lastName} · {session?.subject}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 p-1"><X size={20} /></button>
        </div>

        {done ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
              <Send size={24} className="text-teal-600" />
            </div>
            <p className="font-semibold text-slate-800">Summary sent!</p>
            <p className="text-sm text-slate-500 mt-1">Payment link emailed to {student?.parentEmail}</p>
          </div>
        ) : (
          <div className="px-5 pb-6 space-y-5">

            {/* Topics covered */}
            <ChipGroup label="✓ Topics Covered" chips={TOPICS} selected={covered}
              onToggle={val => toggle(covered, setCovered, val)} color="teal" />

            {/* Needs work */}
            <ChipGroup label="⚠ Needs More Work" chips={WORK_ON} selected={needsWork}
              onToggle={val => toggle(needsWork, setNeedsWork, val)} color="amber" />

            {/* Homework */}
            <ChipGroup label="📚 Homework Set" chips={HOMEWORK} selected={homework}
              onToggle={val => toggle(homework, setHomework, val)} color="blue" />

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Extra notes for parent
              </label>
              <textarea value={notesForParent} onChange={e => setNotesForParent(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors min-h-20 resize-none"
                placeholder="Any extra context to add…" />
            </div>

            {/* Email preview — collapsible */}
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <button onClick={() => setShowPreview(!showPreview)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700">
                Preview parent email
                {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showPreview && (
                <div className="p-4 text-xs text-slate-600 leading-relaxed space-y-2">
                  <p>Hi {student?.parentName || 'there'},</p>
                  {covered.length > 0 && <p><strong>Covered:</strong> {covered.join(', ')}.</p>}
                  {needsWork.length > 0 && <p><strong>Focus next time:</strong> {needsWork.join(', ')}.</p>}
                  {homework.length > 0 && <p><strong>Homework:</strong> {homework.join(', ')}.</p>}
                  {notesForParent && <p>{notesForParent}</p>}
                  <div className="bg-teal-50 rounded-lg p-3 text-center border border-teal-200 mt-2">
                    <div className="text-lg font-bold text-teal-800">{amount}</div>
                    <div className="inline-block mt-1.5 bg-teal-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold">Pay Now via Stripe →</div>
                  </div>
                </div>
              )}
            </div>

            {/* Send button — large tap target */}
            <button onClick={handleSend} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold text-white transition-all disabled:opacity-50 active:scale-98"
              style={{ background: 'var(--teal)', minHeight: '56px' }}>
              <Send size={18} />
              {saving ? 'Sending…' : `Send Summary + ${amount} Payment Link`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ChipGroup({ label, chips, selected, onToggle, color }) {
  const colors = {
    teal:  { on: 'bg-teal-100 text-teal-800 border-teal-300',  off: 'bg-slate-50 text-slate-500 border-slate-200' },
    amber: { on: 'bg-amber-100 text-amber-800 border-amber-300', off: 'bg-slate-50 text-slate-500 border-slate-200' },
    blue:  { on: 'bg-blue-100 text-blue-800 border-blue-300',  off: 'bg-slate-50 text-slate-500 border-slate-200' },
  }[color]

  return (
    <div className="pt-2">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {chips.map(chip => (
          <button key={chip} type="button" onClick={() => onToggle(chip)}
            className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all active:scale-95
              ${selected.includes(chip) ? colors.on : colors.off}`}
            style={{ minHeight: '36px' }}>
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
