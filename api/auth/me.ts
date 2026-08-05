import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, getCurrentUser } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['GET'])) return;

  try {
    const user = await getCurrentUser(req);
    // Not being signed in is a normal state for this endpoint, not an error —
    // the app calls it on boot to decide what to render.
    res.status(200).json({
      user: user ? { id: user.id, email: user.email, role: user.role } : null,
    });
  } catch (err: any) {
    console.error('me failed:', err);
    res.status(500).json({ error: 'სერვერის შეცდომა.' });
  }
}
