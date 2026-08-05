import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { sql, UserRow } from './db';

const COOKIE_NAME = 'solo_session';
const SESSION_DAYS = 7;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    // A missing secret must not silently fall back to a shared default —
    // that would let anyone mint a valid session token.
    throw new Error('SESSION_SECRET is not configured.');
  }
  return value;
}

/**
 * HS256 tokens signed with node:crypto rather than a JWT library.
 *
 * `jose` v6 is ESM-only — its package exports declare no `require` condition —
 * so a CommonJS build of these functions crashed on import with ERR_REQUIRE_ESM
 * under any runtime that does not allow require() of ES modules. Node's own
 * crypto has no such constraint and needs no dependency.
 */
interface SessionPayload {
  uid: number;
  role: string;
  iat: number;
  exp: number;
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

function encodeSegment(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(user: { id: number; role: string }): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encodeSegment({ alg: 'HS256', typ: 'JWT' });
  const payload = encodeSegment({
    uid: user.id,
    role: user.role,
    iat: issuedAt,
    exp: issuedAt + SESSION_DAYS * 24 * 60 * 60,
  });
  const body = `${header}.${payload}`;
  return `${body}.${sign(body)}`;
}

/** Verify signature and expiry, returning the payload or null. */
function verifySessionPayload(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  const expected = Buffer.from(sign(`${header}.${payload}`));
  const received = Buffer.from(signature);
  // Length is checked first because timingSafeEqual throws on a mismatch.
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  let claims: SessionPayload;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (typeof claims?.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }
  return claims;
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=${maxAge}`
  );
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=0`
  );
}

function readCookie(req: VercelRequest, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

/**
 * Resolve the caller from the session cookie. Re-reads the user row on every
 * request so a deactivated or deleted account loses access immediately rather
 * than staying valid until its token expires.
 */
export async function getCurrentUser(req: VercelRequest): Promise<UserRow | null> {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;

  const claims = verifySessionPayload(token);
  if (!claims) return null;

  const uid = Number(claims.uid);
  if (!uid) return null;

  const rows = (await sql`
    SELECT id, email, role, is_active, created_at
    FROM users WHERE id = ${uid} AND is_active = TRUE
  `) as UserRow[];
  return rows[0] || null;
}

export async function requireUser(
  req: VercelRequest,
  res: VercelResponse
): Promise<UserRow | null> {
  const user = await getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: 'ავტორიზაცია საჭიროა.' });
    return null;
  }
  return user;
}

export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<UserRow | null> {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'საჭიროა ადმინისტრატორის უფლება.' });
    return null;
  }
  return user;
}

/** Reject any method other than those listed; returns false when handled. */
export function allowMethods(
  req: VercelRequest,
  res: VercelResponse,
  methods: string[]
): boolean {
  if (!methods.includes(req.method || '')) {
    res.setHeader('Allow', methods.join(', '));
    res.status(405).json({ error: `მეთოდი ${req.method} დაუშვებელია.` });
    return false;
  }
  return true;
}
