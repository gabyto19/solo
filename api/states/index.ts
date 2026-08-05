import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, StateRow, describeServerError } from '../_lib/db';
import { allowMethods, requireAdmin, requireUser } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  try {
    if (req.method === 'GET') {
      // Any signed-in user may read the price list; only admins may change it.
      const user = await requireUser(req, res);
      if (!user) return;

      const states = (await sql`
        SELECT id, name, price, updated_at FROM states ORDER BY name ASC
      `) as StateRow[];
      res.status(200).json({
        states: states.map((s) => ({ ...s, price: Number(s.price) })),
      });
      return;
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const name = String(req.body?.name || '').trim();
    const price = Number(req.body?.price);

    if (!name) {
      res.status(400).json({ error: 'შეიყვანეთ ლოკაციის დასახელება.' });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      res.status(400).json({ error: 'ფასი უნდა იყოს დადებითი რიცხვი.' });
      return;
    }

    const rows = (await sql`
      INSERT INTO states (name, price) VALUES (${name}, ${price})
      ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()
      RETURNING id, name, price, updated_at
    `) as StateRow[];

    res.status(201).json({ state: { ...rows[0], price: Number(rows[0].price) } });
  } catch (err: any) {
    console.error('states request failed:', err);
    const d = describeServerError(err);
    res.status(d.status).json({ error: d.error });
  }
}
