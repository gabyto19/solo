import { neon, NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Vercel injects one of these when a Neon/Postgres store is linked. Read at
 * call time rather than module load: the value is only absent when the project
 * is misconfigured, and crashing on import turns that into an opaque 500 on
 * every route instead of a message that says what is wrong.
 */
function connectionString(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ''
  );
}

export function hasDatabase(): boolean {
  return !!connectionString();
}

/** Thrown when the database is not configured, so handlers can say so plainly. */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL არ არის კონფიგურირებული Vercel-ის გარემოში.');
    this.name = 'DatabaseNotConfiguredError';
  }
}

let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!client) {
    const cs = connectionString();
    // neon() throws on an empty string; raise our own error so the cause is
    // identifiable rather than surfacing as a generic crash.
    if (!cs) throw new DatabaseNotConfiguredError();
    client = neon(cs);
  }
  return client;
}

/**
 * Tagged-template query, same call shape as neon's own client but resolved
 * lazily: sql`SELECT ...`
 */
export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  (getClient() as any)(strings, ...values)) as NeonQueryFunction<false, false>;

/**
 * `developer` has every administrator right, and is additionally invisible to
 * administrators: they cannot list, edit, deactivate or delete it. It is only
 * ever created by the migration, from DEVELOPER_EMAIL / DEVELOPER_PASSWORD.
 */
export type Role = 'admin' | 'user' | 'developer';

/** Whether a role may use the administrator pages and APIs. */
export function hasAdminRights(role: string): boolean {
  return role === 'admin' || role === 'developer';
}

export interface UserRow {
  id: number;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  /** Page keys a `user` may open; administrators and developers open every page. */
  pages: string[];
}

/** What a new account may open until an administrator grants more. */
export const DEFAULT_PAGES = ['calculator'];

/** Page keys are short slugs chosen by the frontend's page registry. */
export function isValidPageKey(key: unknown): key is string {
  return typeof key === 'string' && /^[a-z0-9-]{1,40}$/.test(key);
}

export function canAccessPage(user: Pick<UserRow, 'role' | 'pages'>, page: string): boolean {
  return hasAdminRights(user.role) || (user.pages || []).includes(page);
}

let schemaReady: Promise<void> | null = null;

/**
 * Add columns introduced after the first migration, once per cold start.
 *
 * Without this, deploying code that reads `users.pages` before anyone re-runs
 * the migration would break every sign-in until they did. The statement is a
 * no-op once the column exists. A failure is not cached, so the next request
 * retries.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pages TEXT[] NOT NULL DEFAULT ARRAY['calculator']::text[]
      `;
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export interface StateRow {
  id: number;
  name: string;
  price: string | number;
  updated_at: string;
}

/**
 * Turn the handful of misconfigurations that actually happen into messages the
 * operator can act on. Everything else stays generic, so internal details are
 * not exposed.
 */
export function describeServerError(err: any): { status: number; error: string } {
  if (err instanceof DatabaseNotConfiguredError) {
    return {
      status: 500,
      error:
        'ბაზა არ არის დაკავშირებული. დაამატეთ Neon/Postgres და გააკეთეთ Redeploy.',
    };
  }

  const message = String(err?.message || err);

  // 42P01 = undefined_table: schema exists but the migration has not been run.
  if (err?.code === '42P01' || /relation .* does not exist/i.test(message)) {
    return {
      status: 503,
      error:
        'ბაზის ცხრილები არ არსებობს — გაუშვით მიგრაცია: POST /api/migrate?secret=…',
    };
  }

  if (/SESSION_SECRET/i.test(message)) {
    return {
      status: 500,
      error: 'SESSION_SECRET არ არის კონფიგურირებული. დაამატეთ და გააკეთეთ Redeploy.',
    };
  }

  return { status: 500, error: 'სერვერის შეცდომა.' };
}
