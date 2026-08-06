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
 * separators and decimal places. Returns undefined when the value holds no
 * number to add to.
 */
function addMarkup(value: unknown): unknown | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value + USER_MARKUP_USD : undefined;
  }
  if (typeof value !== 'string') return undefined;

  // The number must end on a digit, so a separator class that also accepts
  // spaces ("1 625") does not swallow the space in "1625 USD".
  const match = value.match(/-?\d(?:[\d,\s]*\d)?(?:\.\d+)?/);
  if (!match || match.index === undefined) return undefined;

  const raw = match[0];
  const numeric = Number(raw.replace(/[,\s]/g, ''));
  if (!Number.isFinite(numeric)) return undefined;

  const decimals = (raw.split('.')[1] || '').length;
  let rendered = (numeric + USER_MARKUP_USD).toFixed(decimals);
  if (raw.includes(',')) {
    const [whole, fraction] = rendered.split('.');
    rendered = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction ? `.${fraction}` : '');
  }

  return value.slice(0, match.index) + rendered + value.slice(match.index + raw.length);
}

/** The first field whose normalised name matches, under its original spelling. */
function findField(value: unknown, target: string): { key: string; value: unknown } | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findField(item, target);
      if (hit) return hit;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;

  const entries = Object.entries(value as Record<string, unknown>);
  // Own keys before nested ones, so an outer total is preferred to a deeper one.
  for (const [key, inner] of entries) {
    if (normalise(key) === target) return { key, value: inner };
  }
  for (const [, inner] of entries) {
    const hit = findField(inner, target);
    if (hit) return hit;
  }
  return null;
}

/**
 * Reduce a price response to what a non-administrator is quoted: the total,
 * plus the margin, and nothing else.
 *
 * The line items are dropped rather than merely hidden by the page. Left in
 * the response they would sit in the browser's network tab, where they both
 * expose the internal breakdown and give away the margin — the parts no
 * longer sum to the total.
 *
 * Returns the body untouched when no total can be identified or the field
 * holds no number. Passing an unmarked price through is bad; quoting a margin
 * added to some unrelated field, or blanking the result entirely, is worse.
 */
export function quoteForUser(body: unknown): { body: unknown; applied: boolean } {
  const keys = new Set<string>();
  collectKeys(body, keys);

  const target = TOTAL_KEYS.find((key) => keys.has(key));
  if (!target) return { body, applied: false };

  const field = findField(body, target);
  if (!field) return { body, applied: false };

  const marked = addMarkup(field.value);
  if (marked === undefined) return { body, applied: false };

  return { body: { [field.key]: marked }, applied: true };
}
