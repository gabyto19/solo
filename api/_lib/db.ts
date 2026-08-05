import { neon } from '@neondatabase/serverless';

/**
 * Neon's HTTP driver — no pooling or teardown to manage, which suits Vercel's
 * per-invocation function model. Reads the connection string Vercel injects
 * when a Neon/Postgres store is linked to the project.
 */
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  '';

if (!connectionString) {
  // Surfaced at call time rather than thrown here, so a misconfigured
  // deployment returns a clear API error instead of a blank 500.
  console.error('No DATABASE_URL / POSTGRES_URL is set — database calls will fail.');
}

export const sql = neon(connectionString);

export function hasDatabase(): boolean {
  return !!connectionString;
}

export interface UserRow {
  id: number;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
}

export interface StateRow {
  id: number;
  name: string;
  price: string | number;
  updated_at: string;
}
