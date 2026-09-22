import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, hasDatabase, Role } from './_lib/db';
import { allowMethods, hashPassword } from './_lib/auth';
import { STATES_SEED } from './_lib/states-seed';

/**
 * One-off setup: creates the schema, seeds the administrator from environment
 * variables, and loads the price list. Every step is idempotent, so re-running
 * is safe and will not overwrite prices that have since been edited.
 *
 * Guarded by MIGRATE_SECRET because it writes to the database:
 *   POST /api/migrate?secret=...
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['POST'])) return;

  const expected = process.env.MIGRATE_SECRET;
  if (!expected) {
    res.status(500).json({ error: 'MIGRATE_SECRET არ არის კონფიგურირებული.' });
    return;
  }
  // Accept the secret in a header as well as the query string. Secrets are
  // usually base64 (`openssl rand -base64 32`), and a `+` in a query string is
  // decoded as a space — so an un-encoded secret silently never matches. The
  // header carries the value verbatim and avoids the trap entirely.
  const provided =
    (req.headers['x-migrate-secret'] as string | undefined) ||
    String(req.query['secret'] || '');

  if (provided !== expected) {
    res.status(403).json({
      error:
        'არასწორი secret. თუ query-ში აგზავნით, გამოიყენეთ encodeURIComponent — ' +
        'base64-ის `+` სიმბოლო URL-ში ჰარედ იკითხება.',
    });
    return;
  }
  if (!hasDatabase()) {
    res.status(500).json({ error: 'DATABASE_URL არ არის კონფიგურირებული.' });
    return;
  }

  const steps: string[] = [];

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'user',
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS states (
        id         SERIAL PRIMARY KEY,
        name       TEXT UNIQUE NOT NULL,
        price      NUMERIC(10,2) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    steps.push('schema ready');

    // ── Seeded accounts ──────────────────────────────────────────
    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    steps.push(await seedAccount('admin', adminEmail, process.env.ADMIN_PASSWORD));

    // The developer account is optional. It is invisible to administrators,
    // which is why it can only come from here and not from the admin page.
    const developerEmail = String(process.env.DEVELOPER_EMAIL || '').trim().toLowerCase();
    if (developerEmail && developerEmail === adminEmail) {
      steps.push('developer skipped — DEVELOPER_EMAIL must differ from ADMIN_EMAIL');
    } else {
      steps.push(await seedAccount('developer', developerEmail, process.env.DEVELOPER_PASSWORD));
    }

    // ── Price list ───────────────────────────────────────────────
    const before = (await sql`SELECT COUNT(*)::int AS n FROM states`) as any[];

    const names = STATES_SEED.map((s) => s.name);
    const prices = STATES_SEED.map((s) => s.price);
    // UNNEST loads all rows in one statement instead of 403 round trips.
    await sql`
      INSERT INTO states (name, price)
      SELECT * FROM UNNEST(${names}::text[], ${prices}::numeric[])
      ON CONFLICT (name) DO NOTHING
    `;

    const after = (await sql`SELECT COUNT(*)::int AS n FROM states`) as any[];
    steps.push(
      `states: ${before[0].n} → ${after[0].n} (${STATES_SEED.length} in seed, existing rows untouched)`
    );

    res.status(200).json({ ok: true, steps });
  } catch (err: any) {
    console.error('migration failed:', err);
    res.status(500).json({ error: String(err?.message || err), steps });
  }
}

/**
 * Create an account from environment variables, or re-assert the role of one
 * that already exists. An existing account keeps its current password, so
 * re-running never silently resets a password that was changed in-app.
 */
async function seedAccount(
  role: Role,
  email: string,
  password: string | undefined
): Promise<string> {
  const prefix = role.toUpperCase();
  if (!email || !password) {
    return `${role} skipped — ${prefix}_EMAIL / ${prefix}_PASSWORD not set`;
  }
  if (password.length < 8) {
    return `${role} skipped — ${prefix}_PASSWORD shorter than 8 characters`;
  }

  const hash = await hashPassword(password);
  const rows = (await sql`
    INSERT INTO users (email, password_hash, role)
    VALUES (${email}, ${hash}, ${role})
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, is_active = TRUE
    RETURNING id, (xmax = 0) AS inserted
  `) as any[];
  return rows[0]?.inserted ? `${role} created: ${email}` : `${role} already existed: ${email}`;
}
