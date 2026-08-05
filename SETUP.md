# Setup

The app is an Angular SPA plus serverless functions under `api/`, deployed
together on Vercel. Everything below is configured once, in the Vercel project.

## 1. Create the database

Vercel dashboard → **Storage** → **Create Database** → **Neon (Postgres)** →
connect it to this project.

The integration injects `DATABASE_URL` / `POSTGRES_URL` automatically; nothing
to copy by hand.

> Neon suspends an idle free-tier database but wakes it on the next query, so a
> quiet period will not break a deployment. (The previous Supabase instance had
> to be un-paused by hand, which is what broke the earlier builds.)

## 2. Environment variables

Vercel → **Settings → Environment Variables**. Add these to every environment
you deploy (Production, Preview, Development):

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | Signs session cookies. Any long random string. **Changing it signs everyone out.** |
| `ADMIN_EMAIL` | Email of the administrator created by the migration. |
| `ADMIN_PASSWORD` | That administrator's initial password (min. 8 characters). |
| `MIGRATE_SECRET` | Guards `/api/migrate` so only you can run it. Any random string. |
| `DEALER_ID` | LionTrans dealer id — `14844`. |
| `DEALER_API_KEY` | LionTrans API key. |

Generate the random values with:

```bash
openssl rand -base64 32
```

None of these reach the browser. The dealer credentials are attached to the
upstream request inside `api/dealer/`, so they never appear in the JavaScript
bundle — which matters here, because this repository is public.

## 3. Run the migration

After the first deploy, once:

```bash
curl -X POST "https://<your-domain>/api/migrate?secret=<MIGRATE_SECRET>"
```

It creates the tables, seeds the administrator, and loads the 403 auction
locations from `api/_lib/states-seed.ts`.

Re-running is safe: it never duplicates rows, never overwrites a price edited
in the admin page, and never resets a password that was changed after the
account was created.

Expected response:

```json
{ "ok": true, "steps": ["schema ready", "admin created: you@example.com", "states: 0 → 403 (403 in seed, existing rows untouched)"] }
```

## 4. Sign in

Open the site and log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The **ადმინი**
tab appears for administrators only, and from there you can:

- create accounts for other people, as administrator or ordinary user
- deactivate or delete an account, or reset its password
- edit any location's price — changes take effect immediately, no redeploy

Change the seeded administrator's password from that page after the first
sign-in, so the value in `ADMIN_PASSWORD` stops being live.

## Local development

```bash
npm install
npm start        # Angular dev server on :4200 — UI only, /api is not served
```

To run the serverless functions locally you need the Vercel CLI and a `.env`
containing the variables above:

```bash
npx vercel dev
```

## Routes

| Route | Access |
| --- | --- |
| `/password` | public — the login page |
| `/list`, `/calculator`, `/deposit`, `/vehicle` | any signed-in user |
| `/admin` | administrators only |

Both layers are enforced: the Angular guards decide what to render, and every
`api/` handler independently re-checks the session, so a crafted request cannot
bypass the UI.
