import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, StateRow } from '../_lib/db';
import { allowMethods, requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['PUT', 'DELETE'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = Number(req.query['id']);
  if (!id) {
    res.status(400).json({ error: 'ლოკაციის ID არასწორია.' });
    return;
  }

  try {
    if (req.method === 'DELETE') {
      const rows = (await sql`DELETE FROM states WHERE id = ${id} RETURNING id`) as any[];
      if (!rows.length) {
        res.status(404).json({ error: 'ლოკაცია ვერ მოიძებნა.' });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    const name = req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
    const price = req.body?.price !== undefined ? Number(req.body.price) : undefined;

    if (name !== undefined && !name) {
      res.status(400).json({ error: 'დასახელება ცარიელი ვერ იქნება.' });
      return;
    }
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      res.status(400).json({ error: 'ფასი უნდა იყოს დადებითი რიცხვი.' });
      return;
    }

    if (name !== undefined) {
      await sql`UPDATE states SET name = ${name}, updated_at = NOW() WHERE id = ${id}`;
    }
    if (price !== undefined) {
      await sql`UPDATE states SET price = ${price}, updated_at = NOW() WHERE id = ${id}`;
    }

    const rows = (await sql`
      SELECT id, name, price, updated_at FROM states WHERE id = ${id}
    `) as StateRow[];
    if (!rows.length) {
      res.status(404).json({ error: 'ლოკაცია ვერ მოიძებნა.' });
      return;
    }
    res.status(200).json({ state: { ...rows[0], price: Number(rows[0].price) } });
  } catch (err: any) {
    console.error('state update failed:', err);
    res.status(500).json({ error: 'სერვერის შეცდომა.' });
  }
}
