import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, requireUser } from './_lib/auth';

const UPSTREAM = 'https://apidealer.payauto.de/api/ApiForDealers';

/**
 * Only these upstream endpoints may be reached through the proxy. Without a
 * whitelist this route would forward any path an attacker appended, turning it
 * into an open proxy that spends the dealer's API quota.
 */
const ALLOWED = new Set([
  'AuctionsDropDownForDealerApi',
  'StatesDropDownForDealerApi',
  'AuctionCitiesDropDownForDealerApi',
  'CarTypesDropDownForDealerApi',
  'GetInternationalPortsDropDownForDealerApi',
  'DeliveryPortsDropDownForDealerApi',
  'ServicePricesForDealerApi',
  'GetCalculatorDataForDealerApi',
  'ParseCarFromIAAIForDealerApi',
  'ParseCarFromCopartForDealerApi',
]);

/** Credentials the client must never see; supplied by the server every time. */
const CREDENTIAL_PARAMS = ['dealerId', 'apiKey', 'endpoint'];

/**
 * Resolve the upstream endpoint name.
 *
 * This lives at a static path rather than api/dealer/[...path].ts: dynamic
 * route segments were not being registered by the deployment, so every request
 * to /api/dealer/<name> returned 404 while the static routes worked. A rewrite
 * in vercel.json maps /api/dealer/<name> onto ?endpoint=<name>, and the URL is
 * read as a fallback so the handler works with or without that rewrite.
 */
function resolveEndpoint(req: VercelRequest): string {
  const fromQuery = req.query['endpoint'];
  if (fromQuery) return Array.isArray(fromQuery) ? fromQuery[0] : String(fromQuery);

  const path = (req.url || '').split('?')[0];
  const match = path.match(/\/api\/dealer\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['GET'])) return;

  // Proxying is gated on a session, so the dealer quota is only spendable by
  // accounts the administrator created.
  const user = await requireUser(req, res);
  if (!user) return;

  const endpoint = resolveEndpoint(req);
  if (!ALLOWED.has(endpoint)) {
    res.status(404).json({ error: `უცნობი ენდპოინტი: ${endpoint || '(ცარიელი)'}` });
    return;
  }

  const dealerId = process.env.DEALER_ID;
  const apiKey = process.env.DEALER_API_KEY;
  if (!dealerId || !apiKey) {
    res.status(500).json({
      error: 'DEALER_ID / DEALER_API_KEY არ არის კონფიგურირებული სერვერზე.',
    });
    return;
  }

  const url = new URL(`${UPSTREAM}/${endpoint}`);
  for (const [key, value] of Object.entries(req.query)) {
    // Credentials sent by the client are discarded rather than trusted, and
    // `endpoint` is routing information, not an upstream parameter.
    if (CREDENTIAL_PARAMS.includes(key)) continue;
    if (value === undefined) continue;
    url.searchParams.set(key, Array.isArray(value) ? value[0] : String(value));
  }
  url.searchParams.set('dealerId', dealerId);
  url.searchParams.set('apiKey', apiKey);

  try {
    const upstream = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    const text = await upstream.text();

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    // Never cache: prices are per-dealer and change upstream.
    res.setHeader('Cache-Control', 'no-store');
    res.send(text);
  } catch (err: any) {
    console.error(`dealer proxy failed for ${endpoint}:`, err);
    res.status(502).json({ error: 'ტრანსპორტის API-სთან კავშირი ვერ დამყარდა.' });
  }
}
