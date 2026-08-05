import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, describeServerError } from '../_lib/db';
import {
  allowMethods,
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['POST'])) return;

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    res.status(400).json({ error: 'შეიყვანეთ ელფოსტა და პაროლი.' });
    return;
  }

  try {
    const rows = (await sql`
      SELECT id, email, password_hash, role, is_active
      FROM users WHERE email = ${email}
    `) as any[];
    const user = rows[0];

    // One message for every failure mode, so the response cannot be used to
    // discover which email addresses exist.
    const ok = user && user.is_active && (await verifyPassword(password, user.password_hash));
    if (!ok) {
      res.status(401).json({ error: 'ელფოსტა ან პაროლი არასწორია.' });
      return;
    }

    const token = await createSessionToken({ id: user.id, role: user.role });
    setSessionCookie(res, token);
    res.status(200).json({
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err: any) {
    console.error('login failed:', err);
    const d = describeServerError(err);
    res.status(d.status).json({ error: d.error });
  }
}
