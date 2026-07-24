# 1128 Forms

Typeform-quality public forms for **1128 Church**, wired to Planning Center (people SoT) and Resend welcome mail.

## What’s in MVP

- **FormPlayer** — one-question focus, directional Motion transitions, keyboard (Enter / ↑ / A·B·C), progress, reduced-motion path
- Forms: `/f/newcomer`, `/f/volunteer`
- Submit pipeline: Zod validate → PCO upsert → submission ledger → Resend email
- Thin admin at `/admin` (allowlisted email + password)

Without env credentials the app still runs: PCO/email/DB fall back to mock/memory so you can dogfood the UX immediately.

## Stack

Next.js (App Router) · Tailwind · Motion · Zod · Neon/Postgres · Resend · React Email · Planning Center People API

## Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Admin defaults (override in `.env.local`):

- Email: value in `ADMIN_EMAILS` (default includes `yimark56@gmail.com`)
- Password: `ADMIN_PASSWORD` or `1128-admin`

## Env

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres (Neon/Supabase). Omit → in-memory ledger |
| `PCO_APP_ID` / `PCO_SECRET` | Planning Center PAT. Omit → mock person ids |
| `RESEND_API_KEY` / `RESEND_FROM` | Transactional email. Omit → console mock |
| `AUTH_SECRET` | JWT signing for admin cookie |
| `ADMIN_PASSWORD` / `ADMIN_EMAILS` | Staff login allowlist |

Apply SQL from `drizzle/0000_init.sql` (or `npm run db:push`) when using Postgres.

## Brand

Tokens match [1128church.org](https://www.1128church.org/): cream surfaces, gold accent `#C4A265`, Cormorant Garamond + DM Sans.

## Build order (from plan)

1. FormPlayer until it delights on mobile  
2. Real schemas (newcomer / volunteer)  
3. PCO + Resend + ledger  
4. Thin admin  

V1 later: drips (T+3/T+7), more schema-only forms, richer PCO workflows.
