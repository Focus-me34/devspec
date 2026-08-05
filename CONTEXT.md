# devSpec, project context

Drop this file at the root of the repo. Claude Code reads it and picks up
where the previous session left off.

---

## What this is

A feature specification tool for small development teams. The premise: feature
discussions die in group chat, so devSpec keeps the discussion attached to the
feature and refuses to let anything move forward until it is properly defined.

**The gate is the product.** A feature cannot leave `discussion` until all five
text questions are answered and at least one acceptance check exists. This rule
lives in a Postgres trigger, not in the UI, so no client and no future refactor
can route around it. If a change would weaken or bypass that trigger, it is the
wrong change.

Audience: teams of 2 to 10. Possibly a commercial product later. Simplicity is
the hard constraint. Features that make it more like Jira are out by default.

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15, App Router | |
| Mutations | **API route handlers only** | Server Actions are deliberately not used. Do not introduce them. |
| Host | Vercel | Hobby plan |
| Database | Neon Postgres | free tier, EU region |
| ORM | Drizzle | schema in `src/db/schema.ts` |
| Auth | hand-rolled: `bcryptjs` + `jose` JWT cookie | see "Auth" below |
| Styling | plain CSS with variables in `src/app/globals.css` | no Tailwind |
| Language | TypeScript, strict | |
| Local port | **3131** | set in `package.json` scripts |

---

## Current state

### Working
- Marketing homepage at `/` with SEO metadata, JSON-LD (SoftwareApplication +
  FAQPage), `sitemap.ts` and `robots.ts` (which disallows `/app` and `/api`)
- Register and sign in at `/login`
- Feature list at `/app`: project tabs, status filters, search, light and dark
  toggle
- Feature page at `/app/features/[id]`: five-stage rail, six spec questions,
  acceptance checks as separate rows, owner, branch URL, blocked flag, notes,
  activity log
- Project create, rename and delete, all through a shared modal
- The spec gate, enforced by the `enforce_spec_gate()` trigger
- Runs locally against Neon

### Uncertain, verify first
- **Vercel deployment.** The last build failed twice. First because
  `src/db/index.ts` connected at module scope, which breaks Next's "collecting
  page data" step. That is fixed: the client is now lazy, behind a Proxy.
  Second because the `DATABASE_URL` value pasted into the Vercel dashboard was
  malformed, most likely wrapping quotes copied in from the `.env` file. Values
  in the Vercel UI must be raw, no quotes, no trailing whitespace.
  Whether the deploy has since succeeded is unknown. Check it.

### Not built yet
See "What is left" below.

---

## Repository layout

```
src/
  app/
    page.tsx                      marketing homepage
    layout.tsx                    metadata, fonts, theme attribute
    globals.css                   all styling, light + dark variables
    robots.ts  sitemap.ts
    login/page.tsx                register and sign in
    app/page.tsx                  feature list
    app/features/[id]/page.tsx    feature detail and the gate UI
    api/
      auth/register/route.ts      POST, creates user + team (no project)
      auth/login/route.ts         POST
      auth/logout/route.ts        POST
      teams/route.ts              GET list, POST create
      projects/route.ts           GET list, POST create
      projects/[id]/route.ts      GET count, PATCH rename, DELETE
      features/route.ts           GET list+search, POST create
      features/[id]/route.ts      GET, PATCH, DELETE
      features/[id]/status/route.ts   POST, the gated transition
      features/[id]/notes/route.ts    POST
  components/Modal.tsx            confirm and prompt modal
  db/schema.ts                    Drizzle tables
  db/index.ts                     lazy Neon + Drizzle client
  lib/session.ts                  JWT cookie sessions
  lib/guard.ts                    requireUser, requireMember, fail
  lib/spec.ts                     the six questions, the five stages
drizzle/0000_init.sql             schema + the gate trigger
```

---

## Data model

`users`, `teams`, `members` (user + team + role: admin or member), `projects`
(belongs to team), `features` (belongs to project), `notes`, `activity`.

`features.answers` is a single `jsonb` column:

```json
{
  "who": "text", "flow": "text", "fail": "text",
  "out": "text", "breaks": "text",
  "check": ["array", "of", "strings"]
}
```

`features.ref` is a per-project counter (F-01, F-02), computed in a single
atomic `insert ... select coalesce(max(ref),0)+1` because the Neon HTTP driver
does not support interactive transactions.

Notes have no `updated_at` and there is no edit endpoint. **This is
deliberate.** Notes are the record of what was said. Do not add editing.

---

## The six questions

Defined in `src/lib/spec.ts`, and the required keys are duplicated in the
trigger in `drizzle/0000_init.sql`. **Changing one means changing both.**

1. `who` — Who is this for, and what problem does it solve?
2. `flow` — What does the person do, step by step?
3. `check` — How do we know it works? (array, minimum one non-empty entry)
4. `fail` — What happens when it goes wrong?
5. `out` — What is explicitly out of scope?
6. `breaks` — What existing behaviour or data does this change?

## The five statuses

`discussion` → `specified` → `building` → `review` → `deployed`, plus
`dropped` as a terminal state reachable from anywhere.

`blocked` is a boolean flag with a reason, not a status, so a blocked feature
keeps its place in the pipeline.

`dropped` is exempt from the gate. You must be able to kill a vague idea.

---

## Authorization

Every API handler calls `requireMember(teamId)` from `src/lib/guard.ts` before
touching data. The `teamId` is **never** read from the request body: the
handler loads the resource, reads which team it belongs to, and checks
membership against that. Any new route must follow this pattern.

`fail(e)` turns a thrown `HttpError` into the right status code, and turns the
trigger's `SPEC_GATE` exception into a 409.

---

## Auth, and why it is hand-rolled

`src/lib/session.ts` signs a JWT with `jose` and stores it in an httpOnly,
secure, SameSite lax cookie for 30 days. Passwords are bcrypt hashed.

This was a speed decision, not a preference. It is safe enough for a private
team tool but has **no password reset, no email verification and no login rate
limiting**. Registration is currently open to anyone who finds the URL.

Replace it when adding invitations. Two candidates:
- **better-auth** with the organization plugin (teams, roles, invitations)
- **Neon Managed Better Auth**, which stores auth in a `neon_auth` schema in
  the same database and ships a pre-configured organization plugin, free to 1M
  MAU. It was in beta and targeting general availability, so check its status
  before choosing. Note it defaulted to open signup too.

---

## Environment

`.env` locally, dashboard variables on Vercel. Three of them:

```
DATABASE_URL          Neon pooled connection string
AUTH_SECRET           openssl rand -base64 32
NEXT_PUBLIC_SITE_URL  http://localhost:3131 locally, the live URL on Vercel
```

Quote them in `.env` (the connection string contains `&`). Do **not** quote
them in the Vercel dashboard. Tick Production, Preview and Development.

---

## Database gotchas

- The schema is applied by pasting `drizzle/0000_init.sql` into the Neon SQL
  Editor. Drizzle migrations are configured but have not been used yet.
- Every statement is `create table if not exists`, so **re-running the file on
  an existing database silently does nothing.** To reset:
  ```sql
  drop table if exists activity, notes, features, projects, members, teams, users cascade;
  drop function if exists enforce_spec_gate() cascade;
  ```
- `pgcrypto already exists` and `trigger does not exist, skipping` are notices,
  not errors.
- Confirm the gate is armed:
  ```sql
  select tgname from pg_trigger
  where tgrelid = 'features'::regclass and not tgisinternal;
  ```

---

## What is left, in priority order

### 1. Lock registration, 15 min, do this before sharing the URL
Anyone who finds the deployed URL can register. Add an `ALLOWED_EMAILS`
env var (comma separated) and check it in
`src/app/api/auth/register/route.ts`, returning 403 for anything else.

### 2. Get the team in, 20 min
There is no invitation flow. Colleagues register, which creates them their own
team, then a manual SQL insert moves them across:
```sql
insert into members (team_id, user_id, role) values ('<team>', '<user>', 'member');
```
Deliberately crude. A real invitation flow is a day and it does not tell us
whether the team will use the tool.

### 3. Run the trial, 2 weeks
The open question is whether three colleagues actually write things down when
given somewhere to write them. Everything below is on hold until that is
answered.

### 4. Email on Specified, ~3h
The second real feature after the gate. Resend, fired from
`src/app/api/features/[id]/status/route.ts` on the transition into
`specified`, to every member of the team. **Put the entire specification in the
email body, all six answers and every acceptance check, as text.** Not a
summary with a link. The point is that the content lands in the inbox so nobody
can say they did not know.

### 5. Remaining CRUD, ~5h
Team rename and archive (admin only). Member list, role change, removal.
Archive rather than delete for teams, since deleting cascades everything.
Feature delete already exists.

### 6. File attachments, ~4h
Vercel Blob. An `attachments` table is in the plan but not in the schema yet.

### 7. Real search, ~4h
Currently `ilike` across title, the answers jsonb cast to text, and note
bodies. Fine to a few hundred features. Swap to a `tsvector` column with a
GIN index when it slows down.

### 8. Polish, ~6h
Empty states, loading states, error boundaries, mobile pass, keyboard
shortcuts (N for new feature, Esc to go back, both existed in the prototype).

### Explicitly out of scope
Per-field comment threads (notes cover it), real-time collaboration, due dates,
estimates, sprints, burndown, custom fields, custom workflows, GitHub API
integration beyond the branch URL text field, mentions, reactions, unread
badges, mobile apps, priority ordering.

---

## Working agreements

- API route handlers, never Server Actions
- The gate stays in the database
- Notes stay immutable
- New routes start with `requireMember`
- No new dependency without a reason that survives being asked twice
- When a change would make this more like Jira, say so before building it
