// ─── Core Domain Types ───────────────────────────────────────────────────────

export type StudentSource = 'direct' | 'corporate' | 'school' | 'social' | 'other'
export type PaymentMethod = 'stripe' | 'payid' | 'cash' | 'corporate_invoice'
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'waived'
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'
export type StudentStatus = 'active' | 'inactive' | 'paused'

// ─── Student ─────────────────────────────────────────────────────────────────

export interface Student {
  id: string                    // kh:student:{id}
  createdAt: string             // ISO date
  tutorId: string               // Clerk user ID

  // Profile
  firstName: string
  lastName: string
  email: string
  status: StudentStatus

  // Parent / guardian
  parentName: string
  parentEmail: string           // Payment links go here
  parentMobile?: string         // SMS reminders

  // Source
  source: StudentSource
  companyId?: string            // If corporate
  companyName?: string

  // Enrolment
  subject: string
  yearLevel: string
  sessionType: '1on1_online' | '1on1_inperson' | 'group'
  preferredDay: string
  preferredTime: string
  learningGoals: string

  // Payment config (per student — overrides tutor defaults)
  ratePerSession: number        // AUD cents
  sessionDurationMins: number
  billTo: 'parent' | 'student' | 'corporate'
  paymentMethod: PaymentMethod
  autoReminder48h: boolean
  sendSummaryToParent: boolean

  // Stats (computed / cached)
  totalSessions: number
  lastSessionDate?: string
}

// ─── Company (Corporate Client) ──────────────────────────────────────────────

export interface Company {
  id: string                    // kh:company:{id}
  createdAt: string
  tutorId: string
  name: string
  hrContactEmail: string
  billingTermsDays: number      // e.g. 30
  notes?: string
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface Session {
  id: string                    // kh:session:{id}
  createdAt: string
  tutorId: string
  studentId: string
  studentName: string           // Denormalised for display

  // Scheduling
  scheduledDate: string         // ISO date YYYY-MM-DD
  scheduledTime: string         // HH:MM
  durationMins: number
  subject: string
  sessionType: string
  status: SessionStatus

  // Wrap data (filled after session)
  topicsCovered: string[]
  needsMoreWork: string[]
  homeworkSet: string[]
  notesForParent: string
  privateTutorNotes: string

  // Payment
  rateAud: number               // cents
  invoiceId?: string
  paymentStatus: PaymentStatus
  paidAt?: string
  stripePaymentLinkUrl?: string
  stripePaymentLinkId?: string
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string                    // kh:invoice:{id}
  createdAt: string
  tutorId: string
  studentId: string
  studentName: string
  sessionIds: string[]

  amountAud: number             // cents
  status: PaymentStatus
  paidAt?: string
  dueDate: string

  // Stripe
  stripePaymentLinkId?: string
  stripePaymentLinkUrl?: string
  stripePaymentIntentId?: string

  // Email
  summaryEmailSentAt?: string
  reminderSentAt?: string

  // Corporate
  companyId?: string
  companyInvoiceRef?: string
}

// ─── Tutor Settings ──────────────────────────────────────────────────────────

export interface TutorSettings {
  tutorId: string
  appName: string               // Configurable branding
  defaultRateAud: number        // cents
  defaultSessionMins: number
  defaultPaymentMethod: PaymentMethod
  stripeConnectedAccountId?: string
  payId?: string
  resendFromEmail?: string
  autoReminder48h: boolean
  corporateBillingTermsDays: number
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateStudentPayload {
  firstName: string
  lastName: string
  email: string
  parentName: string
  parentEmail: string
  parentMobile?: string
  source: StudentSource
  companyName?: string
  hrContactEmail?: string
  subject: string
  yearLevel: string
  sessionType: string
  preferredDay: string
  preferredTime: string
  learningGoals: string
  ratePerSession: number
  sessionDurationMins: number
  billTo: string
  paymentMethod: PaymentMethod
  autoReminder48h: boolean
  sendSummaryToParent: boolean
}

export interface WrapSessionPayload {
  sessionId: string
  topicsCovered: string[]
  needsMoreWork: string[]
  homeworkSet: string[]
  notesForParent: string
  privateTutorNotes: string
  sendEmailNow: boolean
}

export interface SendPaymentLinkPayload {
  invoiceId: string
  studentId: string
}
