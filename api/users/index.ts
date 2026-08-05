import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, UserRow, describeServerError } from '../_lib/db';
import { allowMethods, hashPassword, requireAdmin } from '../_lib/auth';

/**
 * All user administration lives at this static path. It previously shared work
 * with api/users/[id].ts, but dynamic route segments were not registered by the
 * deployment — those requests 404'd while static routes worked. The id now
 * arrives as ?id=, and a rewrite in vercel.json keeps /api/users/<id> working
 * for callers.
 */
function targetId(req: VercelRequest): number {
  const fromQuery = Number(req.query['id']);
  if (fromQuery) return fromQuery;
  const path = (req.url || '').split('?')[0];
  const match = path.match(/\/api\/users\/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return;

  // Every operation here is administrator-only.
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    if (req.method === 'GET') {
      const users = (await sql`
        SELECT id, email, role, is_active, created_at
        FROM users ORDER BY created_at ASC
      `) as UserRow[];
      res.status(200).json({ users });
      return;
    }

    if (req.method === 'POST') {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const role = req.body?.role === 'admin' ? 'admin' : 'user';

      if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'შეიყვანეთ სწორი ელფოსტა.' });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ error: 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო.' });
        return;
      }

      const existing = (await sql`SELECT id FROM users WHERE email = ${email}`) as any[];
      if (existing.length) {
        res.status(409).json({ error: 'ასეთი ელფოსტა უკვე რეგისტრირებულია.' });
        return;
      }

      const hash = await hashPassword(password);
      const rows = (await sql`
        INSERT INTO users (email, password_hash, role)
        VALUES (${email}, ${hash}, ${role})
        RETURNING id, email, role, is_active, created_at
      `) as UserRow[];

      res.status(201).json({ user: rows[0] });
      return;
    }

    // ── PATCH / DELETE, which act on a single account ──────────────
    const id = targetId(req);
    if (!id) {
      res.status(400).json({ error: 'მომხმარებლის ID არასწორია.' });
      return;
    }

    // Guard against an administrator locking themselves out of their own account.
    if (id === admin.id && req.method === 'DELETE') {
      res.status(400).json({ error: 'საკუთარი ანგარიშის წაშლა შეუძლებელია.' });
      return;
    }

    if (req.method === 'DELETE') {
      const rows = (await sql`DELETE FROM users WHERE id = ${id} RETURNING id`) as any[];
      if (!rows.length) {
        res.status(404).json({ error: 'მომხმარებელი ვერ მოიძებნა.' });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    const { password, role, is_active } = req.body || {};

    if (password !== undefined) {
      if (String(password).length < 8) {
        res.status(400).json({ error: 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო.' });
        return;
      }
      const hash = await hashPassword(String(password));
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${id}`;
    }

    if (role !== undefined) {
      const next = role === 'admin' ? 'admin' : 'user';
      if (id === admin.id && next !== 'admin') {
        res.status(400).json({ error: 'საკუთარი ადმინის უფლების მოხსნა შეუძლებელია.' });
        return;
      }
      await sql`UPDATE users SET role = ${next} WHERE id = ${id}`;
    }

    if (is_active !== undefined) {
      if (id === admin.id && !is_active) {
        res.status(400).json({ error: 'საკუთარი ანგარიშის გათიშვა შეუძლებელია.' });
        return;
      }
      await sql`UPDATE users SET is_active = ${!!is_active} WHERE id = ${id}`;
    }

    const rows = (await sql`
      SELECT id, email, role, is_active, created_at FROM users WHERE id = ${id}
    `) as UserRow[];
    if (!rows.length) {
      res.status(404).json({ error: 'მომხმარებელი ვერ მოიძებნა.' });
      return;
    }
    res.status(200).json({ user: rows[0] });
  } catch (err: any) {
    console.error('users request failed:', err);
    const d = describeServerError(err);
    res.status(d.status).json({ error: d.error });
  }
}
