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
| `src/lib/forms/schema.ts` | **Published contract** (`FORM_SCHEMA_VERSION`), roles, validation, contact/notes |
| `src/lib/forms/*.ts` | One file per form (`schemaVersion`, `version`, steps, email, PCO) |
| `src/lib/forms/registry.ts` | Catalog — parse + register; add one import line for a new form |
| `src/components/form-player/*` | Typeform-style player (no form-specific branches) |
| `src/emails/FormFollowUpEmail.tsx` | One email shell; copy from `form.email` |
| `src/lib/brand.ts` | Org name, service time, colors |
| Ledger | `submissions` stores `form_version`, `form_snapshot_json`, `contact_json`, `answers_json` |

### Versioning

- `schemaVersion` — engine contract (`FORM_SCHEMA_VERSION = 1`). Bump only for breaking Zod/role changes.
- `version` — content revision per form. Bump when steps/copy change how answers should be read.
- Each submission snapshots the full `FormDefinition` + derived `Contact` so admin/replay stay valid after edits.

### Add a new form

1. Create `src/lib/forms/my-form.ts` with a `FormDefinition` (`schemaVersion: 1`, `version: 1`, steps + `role`s + `email` + `success` + `pco`)
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

SQL: `drizzle/0000_init.sql` (+ `0001` / `0002` migrations) or `npm run db:push`.

## Planning Center (People + Services SoT)

PCO is the system of record for **people**, **teams**, and **Sunday schedules**. This app is the form front-door + leader UI that writes through to PCO.

| Module | Role |
|---|---|
| `src/lib/pco/http.ts` | Auth, throttle (~100/20s), JSON:API helpers |
| `src/lib/pco/people.ts` | Search / upsert people, emails, notes |
| `src/lib/pco/services.ts` | Service types, teams, positions, plans, schedule |
| `src/lib/pco/workflows.ts` | Leader use-cases (roster vs Sunday assign) |
| `src/lib/pco/mirror.ts` | Optional Postgres read-cache tables |
| `src/actions/pco-leaders.ts` | Server actions for upcoming leader views |

**Two assignment modes (important):**

1. **Roster** → `PersonTeamPositionAssignment` — standing team membership (“add to Worship”)
2. **Schedule** → `PlanPerson` via `team_members` — this Sunday’s plan (“serve hospitality next week”)

Set `PCO_APP_ID`, `PCO_SECRET`, and `PCO_SERVICE_TYPE_ID`, then leader actions are ready.
