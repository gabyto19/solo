import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, hasDatabase } from './_lib/db';
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

    // ── Administrator ────────────────────────────────────────────
    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD || '');

    if (!adminEmail || !adminPassword) {
      steps.push('admin skipped — ADMIN_EMAIL / ADMIN_PASSWORD not set');
    } else if (adminPassword.length < 8) {
      steps.push('admin skipped — ADMIN_PASSWORD shorter than 8 characters');
    } else {
      const hash = await hashPassword(adminPassword);
      // Existing admin keeps its current password; only the role is re-asserted,
      // so re-running never silently resets a password that was changed in-app.
      const rows = (await sql`
        INSERT INTO users (email, password_hash, role)
        VALUES (${adminEmail}, ${hash}, 'admin')
        ON CONFLICT (email) DO UPDATE SET role = 'admin', is_active = TRUE
        RETURNING id, (xmax = 0) AS inserted
      `) as any[];
      steps.push(rows[0]?.inserted ? `admin created: ${adminEmail}` : `admin already existed: ${adminEmail}`);
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
