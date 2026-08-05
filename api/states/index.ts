import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, StateRow, describeServerError } from '../_lib/db';
import { allowMethods, requireAdmin, requireUser } from '../_lib/auth';

/**
 * The whole price list lives at this static path. It previously shared work
 * with api/states/[id].ts, but dynamic route segments were not registered by
 * the deployment — those requests 404'd while static routes worked. The id now
 * arrives as ?id=, and a rewrite in vercel.json keeps /api/states/<id> working
 * for callers.
 */
function targetId(req: VercelRequest): number {
  const fromQuery = Number(req.query['id']);
  if (fromQuery) return fromQuery;
  const path = (req.url || '').split('?')[0];
  const match = path.match(/\/api\/states\/(\d+)/);
  return match ? Number(match[1]) : 0;
}

const asState = (row: StateRow) => ({ ...row, price: Number(row.price) });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['GET', 'POST', 'PUT', 'DELETE'])) return;

  try {
    if (req.method === 'GET') {
      // Any signed-in user may read the price list; only admins may change it.
      const user = await requireUser(req, res);
      if (!user) return;

      const states = (await sql`
        SELECT id, name, price, updated_at FROM states ORDER BY name ASC
      `) as StateRow[];
      res.status(200).json({ states: states.map(asState) });
      return;
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === 'POST') {
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

      res.status(201).json({ state: asState(rows[0]) });
      return;
    }

    // ── PUT / DELETE, which act on a single location ───────────────
    const id = targetId(req);
    if (!id) {
      res.status(400).json({ error: 'ლოკაციის ID არასწორია.' });
      return;
    }

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
    res.status(200).json({ state: asState(rows[0]) });
  } catch (err: any) {
    console.error('states request failed:', err);
    const d = describeServerError(err);
    res.status(d.status).json({ error: d.error });
  }
}
