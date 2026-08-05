# devSpec

Write the spec before you build it. A feature specification tool for small teams.

Next.js 15 (App Router, API route handlers, no Server Actions), Neon Postgres,
Drizzle ORM, plain CSS.

---

## Get it live (target: 35 minutes)

### 1. Put the folder in place, 1 min

```bash
mv ~/Downloads/devspec ~/code/Focus-me34/devspec
cd ~/code/Focus-me34/devspec
npm install
```

### 2. Neon, 5 min

1. neon.tech, **New project**. Pick an EU region (Frankfurt or Paris).
2. Open **SQL Editor**, paste all of `drizzle/0000_init.sql`, hit Run.
3. **Connection string**, copy the **pooled** one.

### 3. Environment, 2 min

```bash
cp .env.example .env
openssl rand -base64 32     # paste as AUTH_SECRET
```

Fill in `DATABASE_URL` (the pooled string) and `AUTH_SECRET`.
Leave `NEXT_PUBLIC_SITE_URL` for now.

### 4. Check it locally, 3 min

```bash
npm run dev
```

Open http://localhost:3000, click **Start free**, create your account.
You land in the app with a team and a "General" project.

Verify the gate before you go further: create a feature, leave a question
blank, and try to click Specified. It must refuse.

### 5. Ship it, 8 min

```bash
git init && git add -A && git commit -m "devSpec"
gh repo create devspec --private --source=. --push
```

Then on vercel.com: **Add New > Project**, import the repo, and add three
environment variables before deploying:

| Name | Value |
|---|---|
| `DATABASE_URL` | the Neon pooled string |
| `AUTH_SECRET` | the same random string |
| `NEXT_PUBLIC_SITE_URL` | your Vercel URL, no trailing slash |

Deploy. Roughly 90 seconds.

### 6. Add your team, 2 min

There are no invitation emails yet. Send each colleague the URL, have them
click **Start free** and register. That creates them a team of their own, so
then run this once in the Neon SQL Editor to move them into yours:

```sql
-- find the ids
select id, email, name from users;
select id, name from teams;

-- add a user to your team
insert into members (team_id, user_id, role)
values ('<your-team-id>', '<their-user-id>', 'member');

-- optional: remove the throwaway team they created on signup
delete from teams where id = '<their-auto-team-id>';
```

Ugly, and deliberately so. Building a proper invitation flow is a day, and it
does not tell you whether your team will use the tool. Do it after the trial.

### 7. Domain, when you buy it

Vercel > Project > Settings > Domains > add `devspec.app`. Point the
nameservers as instructed. Then update `NEXT_PUBLIC_SITE_URL` and redeploy so
the canonical URL, sitemap and Open Graph tags match.

---

## What is in here

```
src/
  app/
    page.tsx                    marketing homepage, SEO, JSON-LD
    layout.tsx                  metadata, fonts, theme attribute
    robots.ts  sitemap.ts       search engine plumbing
    login/page.tsx              sign in and register
    app/page.tsx                feature list, project tabs, filters, search
    app/features/[id]/page.tsx  the feature page and the gate
    api/
      auth/{register,login,logout}/route.ts
      teams/route.ts
      projects/route.ts
      features/route.ts               list, search, create
      features/[id]/route.ts          read, update, delete
      features/[id]/status/route.ts   the gated transition
      features/[id]/notes/route.ts    append a note
  db/schema.ts                  Drizzle table definitions
  db/index.ts                   Neon driver + Drizzle client
  lib/session.ts                JWT cookie sessions
  lib/guard.ts                  requireUser / requireMember
  lib/spec.ts                   the six questions, the five stages
drizzle/0000_init.sql           schema + the spec gate trigger
```

### The gate

`enforce_spec_gate()` in `drizzle/0000_init.sql` is a Postgres trigger. If any
of the five text answers is blank, or there is not at least one non-empty
acceptance check, the row cannot leave `discussion`. The API turns that
exception into a 409 and the UI shows it.

It lives in the database on purpose. The UI check is a convenience; the trigger
is the rule. You can prove it with curl:

```bash
curl -X POST https://your-url/api/features/<id>/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"specified"}'
# => 409 SPEC_GATE: cannot leave Discussion, "fail" is unanswered
```

`dropped` is the one exception. You must be able to kill a vague idea.

### Authorization

Every API handler calls `requireMember(teamId)` first. The `teamId` is never
taken from the request body: the handler loads the resource, reads which team
it belongs to, and checks membership against that. This is the file to be
careful with when you add routes.

---

## Known gaps, deliberate

- **Auth is hand-rolled** (bcrypt + a signed JWT cookie). It works and it is
  safe for a private team tool: httpOnly, secure in production, SameSite lax,
  30 day expiry. But there is no password reset, no email verification and no
  rate limiting on login. Swap in better-auth with the organization plugin when
  you add invitations, and delete `src/lib/session.ts`.
- **No email on Specified yet.** This is your second real feature. Add Resend
  in the status route, and put the whole spec in the body, not a link.
- **No file attachments yet.** Vercel Blob, roughly 4 hours.
- **No rename or archive for teams and projects.** Roughly 5 hours for the
  remaining CRUD.
- **Search is `ilike`, not full text.** Fine to a few hundred features. Swap to
  a `tsvector` column when it gets slow.
- Notes cannot be edited, and that is not a gap. They are the record.

## Free tier notes

- **Neon free**: 0.5 GB storage and 100 CU-hours per project per month, and it
  scales to zero after 5 minutes idle. A team of four will not come near it.
- **Vercel Hobby**: personal, non-commercial use only under their terms. Fine
  for an internal trial. The day you charge anyone, it is Pro at $20 a seat.
# devspec
