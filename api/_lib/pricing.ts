/**
 * The margin added to the total price for non-administrator accounts.
 *
 * It is applied here, in the proxy, rather than in the browser: the calculator
 * page could add it just as easily, but then the untouched upstream response
 * would still be sitting in the network tab for anyone to read. Adding it
 * before the response leaves the server means an ordinary user has no way to
 * see the price the dealer API actually returned.
 */
export const USER_MARKUP_USD = 600;

/**
 * Candidate names for the total, most specific first.
 *
 * Only `titlePrice` and `internalTransportationPrice` are confirmed field
 * names, so the total is matched against the conventional spellings. This list
 * must stay in step with the total row in src/app/calculator/calculator.component.ts
 * — the markup has to land on the field the page displays.
 */
const TOTAL_KEYS = ['totalprice', 'total', 'totalcost', 'grandtotal', 'finalprice', 'sumprice'];

/** Endpoints whose response carries a price and so needs the markup. */
const PRICED_ENDPOINTS = new Set([
  'ServicePricesForDealerApi',
  'GetCalculatorDataForDealerApi',
  'ParseCarFromIAAIForDealerApi',
  'ParseCarFromCopartForDealerApi',
]);

export function isPricedEndpoint(endpoint: string): boolean {
  return PRICED_ENDPOINTS.has(endpoint);
}

const normalise = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Every normalised key name appearing anywhere in the body. */
function collectKeys(value: unknown, into: Set<string>): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, into);
    return;
  }
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    into.add(normalise(key));
    collectKeys(inner, into);
  }
}

/**
 * Add the markup to one value, keeping whatever formatting it arrived with —
 * a number stays a number, and a string keeps its currency symbol, thousands
 * separators and decimal places.
 */
function addMarkup(value: unknown): unknown {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value + USER_MARKUP_USD : value;
  }
  if (typeof value !== 'string') return value;

  // The number must end on a digit, so a separator class that also accepts
  // spaces ("1 625") does not swallow the space in "1625 USD".
  const match = value.match(/-?\d(?:[\d,\s]*\d)?(?:\.\d+)?/);
  if (!match || match.index === undefined) return value;

  const raw = match[0];
  const numeric = Number(raw.replace(/[,\s]/g, ''));
  if (!Number.isFinite(numeric)) return value;

  const decimals = (raw.split('.')[1] || '').length;
  let rendered = (numeric + USER_MARKUP_USD).toFixed(decimals);
  if (raw.includes(',')) {
    const [whole, fraction] = rendered.split('.');
    rendered = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction ? `.${fraction}` : '');
  }

  return value.slice(0, match.index) + rendered + value.slice(match.index + raw.length);
}

/** Rebuild the body with every occurrence of `target` marked up. */
function rewrite(value: unknown, target: string): unknown {
  if (Array.isArray(value)) return value.map((item) => rewrite(item, target));
  if (!value || typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    out[key] = normalise(key) === target ? addMarkup(inner) : rewrite(inner, target);
  }
  return out;
}

/**
 * Apply the markup to the response body's total.
 *
 * Only the one field the calculator shows as "ჯამში ფასი" is touched, so the
 * individual line items still report what the dealer API said. Returns the
 * body unchanged when no total can be identified — better an unmarked price
 * than a markup silently landing on some unrelated number.
 */
export function applyUserMarkup(body: unknown): { body: unknown; applied: boolean } {
  const keys = new Set<string>();
  collectKeys(body, keys);

  const target = TOTAL_KEYS.find((key) => keys.has(key));
  if (!target) return { body, applied: false };

  return { body: rewrite(body, target), applied: true };
}
