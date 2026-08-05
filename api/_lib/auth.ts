import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { sql, UserRow } from './db';

const COOKIE_NAME = 'solo_session';
const SESSION_DAYS = 7;

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    // A missing secret must not silently fall back to a shared default —
    // that would let anyone mint a valid session token.
    throw new Error('SESSION_SECRET is not configured.');
  }
  return new TextEncoder().encode(value);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(user: { id: number; role: string }): Promise<string> {
  return new SignJWT({ uid: user.id, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
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

  let uid: number;
  try {
    const { payload } = await jwtVerify(token, secret());
    uid = Number(payload.uid);
  } catch {
    return null;
  }
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
