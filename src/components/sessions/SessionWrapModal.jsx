import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { formatMoney } from '../../lib/utils.js'

const TOPICS = ['Complex number proofs','Argand diagrams','De Moivre\'s theorem','Integration review','Vectors','Proof by induction','Differential equations','Mechanics','Waves & optics','Essay structure','Close reading','Critical analysis']
const WORK_ON = ['Integration by substitution','Proof structure','Exam timing','Working clearly','Show all steps','Interpretation','Time management']
const HOMEWORK = ['Practice paper Q1–Q8','Textbook exercises','Review notes','Past exam paper','Rewrite draft','Khan Academy videos']

export default function SessionWrapModal({ session, student, onClose, onWrap }) {
  const [covered, setCovered] = useState([])
  const [needsWork, setNeedsWork] = useState([])
  const [homework, setHomework] = useState([])
  const [notesForParent, setNotesForParent] = useState('')
  const [privateTutorNotes, setPrivateTutorNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  function toggle(arr, setArr, val) {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  async function handleSend() {
    setSaving(true)
    try {
      await onWrap({
        sessionId: session.id,
        topicsCovered: covered,
        needsMoreWork: needsWork,
        homeworkSet: homework,
        notesForParent,
        privateTutorNotes,
        sendEmailNow: true,
      })
      setDone(true)
      setTimeout(onClose, 2000)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const amount = formatMoney(student?.ratePerSession || 11000)
  const parentEmail = student?.parentEmail || 'parent'

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Wrap Session</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {student?.firstName} {student?.lastName} · {session?.subject} · {session?.scheduledDate}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
              <Send size={24} className="text-teal-600" />
            </div>
            <p className="font-semibold text-slate-800">Summary sent!</p>
            <p className="text-sm text-slate-500 mt-1">Payment link emailed to {parentEmail}</p>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-4">
            {/* Topics covered */}
            <ChipGroup label="Topics Covered" chips={TOPICS} selected={covered}
              onToggle={val => toggle(covered, setCovered, val)} color="teal" prefix="✓ " />

            {/* Needs work */}
            <ChipGroup label="Needs More Work" chips={WORK_ON} selected={needsWork}
              onToggle={val => toggle(needsWork, setNeedsWork, val)} color="amber" prefix="⚠ " />

            {/* Homework */}
            <ChipGroup label="Homework Set" chips={HOMEWORK} selected={homework}
              onToggle={val => toggle(homework, setHomework, val)} color="navy" />

            {/* Notes for parent */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Extra notes for parent (optional)
              </label>
              <textarea value={notesForParent} onChange={e => setNotesForParent(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors min-h-16 resize-none"
                placeholder="Any extra context to include in the email…" />
            </div>

            {/* Private notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Private tutor notes — not sent
              </label>
              <textarea value={privateTutorNotes} onChange={e => setPrivateTutorNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-amber-50 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors min-h-12 resize-none"
                placeholder="Internal only…" />
            </div>

            {/* Email preview */}
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 space-y-1">
                <div className="flex gap-2 text-xs"><span className="text-slate-400 w-10 font-semibold">To</span><span className="text-slate-600">{parentEmail}</span></div>
                <div className="flex gap-2 text-xs"><span className="text-slate-400 w-10 font-semibold">CC</span><span className="text-slate-600">{student?.email}</span></div>
                <div className="flex gap-2 text-xs"><span className="text-slate-400 w-10 font-semibold">Re</span><span className="text-slate-600">{student?.firstName}'s session — {session?.subject}</span></div>
              </div>
              <div className="p-4 text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>Hi {student?.parentName},</p>
                <p>Great session today!</p>
                {covered.length > 0 && <p><strong>Covered:</strong> {covered.join(', ')}.</p>}
                {needsWork.length > 0 && <p><strong>Focus next time:</strong> {needsWork.join(', ')}.</p>}
                {homework.length > 0 && <p><strong>Homework:</strong> {homework.join(', ')}.</p>}
                {notesForParent && <p>{notesForParent}</p>}
                {/* Payment block */}
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-center my-2">
                  <div className="text-xl font-bold text-teal-800">{amount}</div>
                  <div className="text-teal-700 text-xs mt-0.5">Session fee · {session?.subject} · {session?.durationMins || student?.sessionDurationMins} min</div>
                  <div className="inline-block mt-2 bg-teal-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold">
                    Pay Now via Stripe →
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <button onClick={handleSend} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--teal)' }}>
              <Send size={15} />
              {saving ? 'Sending…' : `Send Summary + ${amount} Payment Link to Parent`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ChipGroup({ label, chips, selected, onToggle, color, prefix = '' }) {
  const colors = {
    teal:  { on: 'bg-teal-100 text-teal-800 border-teal-300',  off: 'bg-slate-50 text-slate-500 border-slate-200' },
    amber: { on: 'bg-amber-100 text-amber-800 border-amber-300', off: 'bg-slate-50 text-slate-500 border-slate-200' },
    navy:  { on: 'bg-blue-100 text-blue-800 border-blue-300',  off: 'bg-slate-50 text-slate-500 border-slate-200' },
  }[color]

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(chip => (
          <button key={chip} type="button" onClick={() => onToggle(chip)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all
              ${selected.includes(chip) ? colors.on : colors.off}`}>
            {selected.includes(chip) ? prefix : ''}{chip}
          </button>
        ))}
      </div>
    </div>
  )
}
