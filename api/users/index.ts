import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, UserRow, Role, describeServerError, isValidPageKey } from '../_lib/db';
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

/** Parse a requested role; anything unrecognised is an ordinary user. */
function parseRole(value: unknown): Role {
  return value === 'admin' || value === 'developer' ? value : 'user';
}

const NOT_FOUND = 'მომხმარებელი ვერ მოიძებნა.';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return;

  // Every operation here is administrator-only.
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // Developer accounts exist only for other developers. To an administrator
  // they are absent: not listed, and reported as not found when addressed.
  const isDeveloper = admin.role === 'developer';

  try {
    if (req.method === 'GET') {
      const users = (isDeveloper
        ? await sql`
            SELECT id, email, role, is_active, created_at, pages
            FROM users ORDER BY created_at ASC
          `
        : await sql`
            SELECT id, email, role, is_active, created_at, pages
            FROM users WHERE role <> 'developer' ORDER BY created_at ASC
          `) as UserRow[];
      res.status(200).json({ users });
      return;
    }

    if (req.method === 'POST') {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const role = parseRole(req.body?.role);

      if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'შეიყვანეთ სწორი ელფოსტა.' });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ error: 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო.' });
        return;
      }
      if (role === 'developer' && !isDeveloper) {
        res.status(403).json({ error: 'ამ როლის მინიჭება შეუძლებელია.' });
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
        RETURNING id, email, role, is_active, created_at, pages
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

    const targets = (await sql`SELECT role FROM users WHERE id = ${id}`) as { role: Role }[];
    const target = targets[0];
    if (!target || (target.role === 'developer' && !isDeveloper)) {
      res.status(404).json({ error: NOT_FOUND });
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
        res.status(404).json({ error: NOT_FOUND });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    const { password, role, is_active, pages } = req.body || {};
    const nextRole = role !== undefined ? parseRole(role) : undefined;

    // Validate everything before writing anything, so a rejected request
    // never leaves the account half-updated.
    if (password !== undefined && String(password).length < 8) {
      res.status(400).json({ error: 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო.' });
      return;
    }
    if (nextRole === 'developer' && !isDeveloper) {
      res.status(403).json({ error: 'ამ როლის მინიჭება შეუძლებელია.' });
      return;
    }
    if (nextRole !== undefined && id === admin.id && nextRole !== admin.role) {
      res.status(400).json({ error: 'საკუთარი როლის შეცვლა შეუძლებელია.' });
      return;
    }
    if (
      pages !== undefined &&
      (!Array.isArray(pages) || pages.length > 50 || !pages.every(isValidPageKey))
    ) {
      res.status(400).json({ error: 'გვერდების სია არასწორია.' });
      return;
    }
    if (is_active !== undefined && id === admin.id && !is_active) {
      res.status(400).json({ error: 'საკუთარი ანგარიშის გათიშვა შეუძლებელია.' });
      return;
    }

    if (password !== undefined) {
      const hash = await hashPassword(String(password));
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${id}`;
    }
    if (nextRole !== undefined) {
      await sql`UPDATE users SET role = ${nextRole} WHERE id = ${id}`;
    }
    if (pages !== undefined) {
      const unique = [...new Set(pages as string[])];
      await sql`UPDATE users SET pages = ${unique}::text[] WHERE id = ${id}`;
    }
    if (is_active !== undefined) {
      await sql`UPDATE users SET is_active = ${!!is_active} WHERE id = ${id}`;
    }

    const rows = (await sql`
      SELECT id, email, role, is_active, created_at, pages FROM users WHERE id = ${id}
    `) as UserRow[];
    if (!rows.length) {
      res.status(404).json({ error: NOT_FOUND });
      return;
    }
    res.status(200).json({ user: rows[0] });
  } catch (err: any) {
    console.error('users request failed:', err);
    const d = describeServerError(err);
    res.status(d.status).json({ error: d.error });
  }
}
