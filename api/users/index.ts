import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, UserRow, describeServerError } from '../_lib/db';
import { allowMethods, hashPassword, requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  // Both listing and creating users are administrator-only.
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
  } catch (err: any) {
    console.error('users request failed:', err);
    const d = describeServerError(err);
    res.status(d.status).json({ error: d.error });
  }
}
