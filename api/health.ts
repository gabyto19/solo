import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, hasDatabase } from './_lib/db';
import { allowMethods } from './_lib/auth';

/**
 * Reports whether the deployment is configured, so a failing sign-in can be
 * diagnosed without reading Vercel's logs.
 *
 * Returns booleans only — never a value, host or connection string — so it is
 * safe to leave unauthenticated. It has to be reachable while authentication
 * itself is broken, which is exactly when a session check would be useless.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['GET'])) return;

  const env = {
    DATABASE_URL: hasDatabase(),
    SESSION_SECRET: !!process.env.SESSION_SECRET,
    MIGRATE_SECRET: !!process.env.MIGRATE_SECRET,
    ADMIN_EMAIL: !!process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
    DEALER_ID: !!process.env.DEALER_ID,
    DEALER_API_KEY: !!process.env.DEALER_API_KEY,
  };

  let database: Record<string, unknown> = { reachable: false };
  if (env.DATABASE_URL) {
    try {
      const users = (await sql`SELECT COUNT(*)::int AS n FROM users`) as any[];
      const states = (await sql`SELECT COUNT(*)::int AS n FROM states`) as any[];
      database = {
        reachable: true,
        migrated: true,
        users: users[0].n,
        states: states[0].n,
      };
    } catch (err: any) {
      const missingTable =
        err?.code === '42P01' || /relation .* does not exist/i.test(String(err?.message));
      database = {
        reachable: !missingTable ? false : true,
        migrated: false,
        detail: missingTable
          ? 'ცხრილები არ არსებობს — გაუშვით POST /api/migrate?secret=…'
          : 'ბაზასთან დაკავშირება ვერ მოხერხდა.',
      };
    }
  }

  const missing = Object.entries(env)
    .filter(([, present]) => !present)
    .map(([name]) => name);

  const ready = missing.length === 0 && database['migrated'] === true;

  res.status(200).json({
    ready,
    missingEnv: missing,
    env,
    database,
    hint: ready
      ? 'ყველაფერი მზადაა.'
      : missing.length
        ? 'დაამატეთ ცვლადები Vercel-ში და გააკეთეთ Redeploy — ფუნქციები მათ ბილდის დროს იღებენ.'
        : 'გაუშვით მიგრაცია.',
  });
}
