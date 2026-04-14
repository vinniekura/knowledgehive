// lib/email.js
// All outbound emails via Resend
// Templates: welcome, session summary + payment link, payment reminder

const RESEND_API = 'https://api.resend.com/emails'

async function send({ to, subject, html, replyTo }) {
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@knowledgehive.com.au',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${err}`)
  }
  return res.json()
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail({ student, tutorName, appName = 'KnowledgeHive' }) {
  const { firstName, parentName, parentEmail, email, subject, learningGoals } = student

  await send({
    to: [parentEmail, email].filter(Boolean),
    subject: `Welcome to ${appName} — ${firstName}'s tutoring starts soon`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <div style="background:#1e3a5f;padding:24px 32px;border-radius:12px 12px 0 0">
          <span style="font-size:22px;font-weight:700;color:#f59e0b">${appName}</span>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 12px 12px">
          <p style="margin:0 0 16px">Hi ${parentName},</p>
          <p style="margin:0 0 16px">
            Great news — <strong>${firstName}</strong> is now enrolled with ${tutorName} for
            <strong>${subject}</strong> tutoring through ${appName}.
          </p>
          ${learningGoals ? `
          <div style="background:#f8fafc;border-left:3px solid #0d9488;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0">
            <p style="margin:0;font-size:13px;color:#475569"><strong>Learning goals:</strong> ${learningGoals}</p>
          </div>` : ''}
          <p style="margin:16px 0">
            After each session you'll receive a summary of what was covered, any homework set, and a
            payment link. Payments are processed securely via Stripe and take about 30 seconds.
          </p>
          <p style="margin:16px 0">Looking forward to working with ${firstName}!</p>
          <p style="margin:0">Warm regards,<br><strong>${tutorName}</strong><br>${appName}</p>
        </div>
      </div>
    `,
  })
}

// ─── Session Summary + Payment Link ──────────────────────────────────────────

export async function sendSessionSummary({
  student,
  session,
  invoice,
  paymentUrl,
  tutorName,
  appName = 'KnowledgeHive',
}) {
  const { firstName, parentName, parentEmail, email } = student
  const { topicsCovered, needsMoreWork, homeworkSet, notesForParent, scheduledDate } = session
  const amountDisplay = `$${(invoice.amountAud / 100).toFixed(2)}`

  const listItems = (arr) =>
    arr.length ? arr.map(i => `<li style="margin:4px 0">${i}</li>`).join('') : '<li>—</li>'

  const dateStr = new Date(scheduledDate).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  await send({
    to: [parentEmail, email].filter(Boolean),
    replyTo: undefined,
    subject: `${firstName}'s session summary — ${dateStr} · ${session.subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <div style="background:#1e3a5f;padding:24px 32px;border-radius:12px 12px 0 0">
          <span style="font-size:22px;font-weight:700;color:#f59e0b">${appName}</span>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 12px 12px">
          <p style="margin:0 0 16px">Hi ${parentName},</p>
          <p style="margin:0 0 20px">
            Here's a summary of ${firstName}'s ${session.subject} session on <strong>${dateStr}</strong>
            (${session.durationMins} min).
          </p>

          ${topicsCovered.length ? `
          <div style="margin-bottom:16px">
            <p style="margin:0 0 6px;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b">Covered this session</p>
            <ul style="margin:0;padding-left:20px;font-size:14px;color:#334155">${listItems(topicsCovered)}</ul>
          </div>` : ''}

          ${needsMoreWork.length ? `
          <div style="margin-bottom:16px">
            <p style="margin:0 0 6px;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b">Focus for next session</p>
            <ul style="margin:0;padding-left:20px;font-size:14px;color:#334155">${listItems(needsMoreWork)}</ul>
          </div>` : ''}

          ${homeworkSet.length ? `
          <div style="margin-bottom:16px">
            <p style="margin:0 0 6px;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b">Homework</p>
            <ul style="margin:0;padding-left:20px;font-size:14px;color:#334155">${listItems(homeworkSet)}</ul>
          </div>` : ''}

          ${notesForParent ? `
          <div style="background:#f8fafc;border-left:3px solid #0d9488;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;font-size:14px;color:#334155">
            ${notesForParent}
          </div>` : ''}

          <!-- Payment block -->
          <div style="background:#ccfbf1;border:1px solid #99f6e4;border-radius:12px;padding:24px;margin:24px 0;text-align:center">
            <p style="margin:0 0 4px;font-size:13px;color:#115e59;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Session Fee</p>
            <p style="margin:0;font-size:32px;font-weight:700;color:#115e59">${amountDisplay}</p>
            <p style="margin:4px 0 16px;font-size:12px;color:#0f766e">${session.subject} · ${session.durationMins} min · ${dateStr}</p>
            <a href="${paymentUrl}"
               style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">
              Pay Now via Stripe →
            </a>
            <p style="margin:10px 0 0;font-size:11px;color:#0f766e">Secure card payment · takes about 30 seconds</p>
          </div>

          <p style="margin:0;font-size:13px;color:#64748b">
            If you have any questions, simply reply to this email.<br><br>
            Warm regards,<br><strong>${tutorName}</strong><br>${appName}
          </p>
        </div>
      </div>
    `,
  })
}

// ─── Payment Reminder ─────────────────────────────────────────────────────────

export async function sendPaymentReminder({
  student,
  invoice,
  paymentUrl,
  tutorName,
  appName = 'KnowledgeHive',
  daysOverdue = 0,
}) {
  const { firstName, parentName, parentEmail } = student
  const amountDisplay = `$${(invoice.amountAud / 100).toFixed(2)}`

  await send({
    to: parentEmail,
    subject: `Friendly reminder — ${firstName}'s session fee of ${amountDisplay} is outstanding`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <div style="background:#1e3a5f;padding:24px 32px;border-radius:12px 12px 0 0">
          <span style="font-size:22px;font-weight:700;color:#f59e0b">${appName}</span>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 12px 12px">
          <p style="margin:0 0 16px">Hi ${parentName},</p>
          <p style="margin:0 0 16px">
            Just a friendly reminder that ${firstName}'s session fee of
            <strong>${amountDisplay}</strong> is still outstanding
            ${daysOverdue > 0 ? `(${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue)` : ''}.
          </p>
          <div style="text-align:center;margin:24px 0">
            <a href="${paymentUrl}"
               style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">
              Pay Now — ${amountDisplay}
            </a>
          </div>
          <p style="margin:0;font-size:13px;color:#64748b">
            If you've already paid, please ignore this message.<br><br>
            Thanks,<br><strong>${tutorName}</strong><br>${appName}
          </p>
        </div>
      </div>
    `,
  })
}
