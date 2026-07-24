# 1128 Forms

Typeform-quality public forms for **1128 Church**, wired to Planning Center (people SoT) and Resend welcome mail.

## Architecture

The form engine is **schema-first**. Player, submit, email, and routes are generic.

```text
FormDefinition (schema)
    ↓
FormPlayer  →  submitFormAction  →  PCO upsert + ledger + Resend
    ↓
/f/[slug]   (auto from registry)
```

| Piece | Responsibility |
|---|---|
| `src/lib/forms/schema.ts` | Step types, field **roles**, validation, contact/notes extraction |
| `src/lib/forms/*.ts` | One file per form (copy, steps, success, email, PCO) |
| `src/lib/forms/registry.ts` | Catalog — add one import line for a new form |
| `src/components/form-player/*` | Typeform-style player (no form-specific branches) |
| `src/emails/FormFollowUpEmail.tsx` | One email shell; copy from `form.email` |
| `src/lib/brand.ts` | Org name, service time, colors |

### Add a new form

1. Create `src/lib/forms/my-form.ts` with a `FormDefinition` (steps + `role`s + `email` + `success` + `pco`)
2. Add it to the `catalog` array in `registry.ts`
3. Done — `/f/my-form` works, home lists it, submit + email use the schema

Mark contact fields with `role: "first_name" | "last_name" | "email" | "phone" | "notes"` (or rely on type/`id` inference).

## What’s in MVP

- **FormPlayer** — one-question focus, Motion, keyboard (Enter / ↑ / A·B·C), progress, reduced-motion
- Forms: `/f/newcomer`, `/f/volunteer`
- Submit: Zod → PCO upsert → ledger → Resend
- Thin admin at `/admin`

Without env credentials the app still runs (mock PCO/email, memory DB).

## Stack

Next.js (App Router) · Tailwind · Motion · Zod · Neon/Postgres · Resend · React Email · Planning Center People API

## Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Admin: allowlisted `ADMIN_EMAILS` + `ADMIN_PASSWORD` (default `1128-admin`).

## Env

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres. Omit → in-memory ledger |
| `PCO_APP_ID` / `PCO_SECRET` | Planning Center PAT. Omit → mock |
| `RESEND_API_KEY` / `RESEND_FROM` | Email. Omit → console mock |
| `AUTH_SECRET` | Admin JWT cookie |
| `ADMIN_PASSWORD` / `ADMIN_EMAILS` | Staff login |

SQL: `drizzle/0000_init.sql` or `npm run db:push`.
