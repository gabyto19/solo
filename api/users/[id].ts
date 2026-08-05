import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, UserRow, describeServerError } from '../_lib/db';
import { allowMethods, hashPassword, requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['PATCH', 'DELETE'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = Number(req.query['id']);
  if (!id) {
    res.status(400).json({ error: 'მომხმარებლის ID არასწორია.' });
    return;
  }

  // Guard against an administrator locking themselves out of their own account.
  if (id === admin.id && req.method === 'DELETE') {
    res.status(400).json({ error: 'საკუთარი ანგარიშის წაშლა შეუძლებელია.' });
    return;
  }

  try {
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
    console.error('user update failed:', err);
    const d = describeServerError(err);
    res.status(d.status).json({ error: d.error });
  }
}
