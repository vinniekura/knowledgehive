# KnowledgeHive — Tutor Platform

Live tutoring management: student registration, session wrap + parent email, Stripe payment links.

## Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Auth**: Clerk (Google/Apple sign-in)
- **Database**: Upstash Redis (shared instance, `kh:` prefix)
- **Email**: Resend
- **Payments**: Stripe Payment Links
- **Deploy**: Vercel (Hobby plan)

## Redis Key Namespacing
Shares the same Upstash free-tier database as other Data Mastery products:
| Prefix | Product |
|--------|---------|
| `mm:` | Market Mastery |
| `cm:` | Content Mastery |
| `kh:` | KnowledgeHive ← this app |

## Quick Start

```bash
cp .env.example .env.local
# Fill in your keys (copy Upstash keys from Market Mastery)
npm install
npm run dev
```

## Environment Variables

| Variable | Where to get it |
|----------|----------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | clerk.com → your app → API Keys |
| `UPSTASH_REDIS_REST_URL` | upstash.com → your database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | same as above |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | your verified sender domain |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → your endpoint |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe → API Keys (publishable) |

## Deploy to Vercel

```bash
npx vercel --prod
```

Add all env vars in Vercel dashboard → Project → Settings → Environment Variables.

## Stripe Webhook Setup

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://your-app.vercel.app/api/webhooks/stripe`
3. Events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/students` | List / create students |
| GET/POST | `/api/sessions` | List / schedule sessions |
| POST | `/api/sessions/wrap` | Wrap session → create Stripe link → email parent |
| GET | `/api/invoices` | List all invoices |
| POST | `/api/reminders` | Send payment reminder |
| POST | `/api/webhooks/stripe` | Mark invoice paid on Stripe event |

## Data Model (Redis keys)

```
kh:student:{id}           → Student object
kh:session:{id}           → Session object
kh:invoice:{id}           → Invoice object
kh:company:{id}           → Company (corporate client)
kh:settings:{tutorId}     → TutorSettings

kh:{tutorId}:students     → ZSET of student IDs (sorted by createdAt)
kh:{tutorId}:sessions     → ZSET of session IDs (sorted by date)
kh:{tutorId}:invoices     → ZSET of invoice IDs
kh:{tutorId}:companies    → ZSET of company IDs
kh:student:{id}:sessions  → ZSET of session IDs for one student
```

## Phase 2 Roadmap
- [ ] Student portal (read-only progress view)
- [ ] AI exam paper generation (Anthropic API)
- [ ] Bulk corporate invoice generation (monthly cron)
- [ ] KnowledgeHive course library
- [ ] Progress tracking per outcome
