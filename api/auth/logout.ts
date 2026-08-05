import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, clearSessionCookie } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['POST'])) return;
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
