/**
 * US state codes and names.
 *
 * The dealer API identifies a city only by its label — "AK - Anchorage" — so
 * relating a city to a state means comparing a two-letter code against
 * whatever the states endpoint returns. A code cannot be derived from a name
 * by taking its first two letters (AK is not ALaska, NJ is not NEw Jersey),
 * so the real mapping is needed.
 */
export const US_STATES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'AL', name: 'ALABAMA' },
  { code: 'AK', name: 'ALASKA' },
  { code: 'AZ', name: 'ARIZONA' },
  { code: 'AR', name: 'ARKANSAS' },
  { code: 'CA', name: 'CALIFORNIA' },
  { code: 'CO', name: 'COLORADO' },
  { code: 'CT', name: 'CONNECTICUT' },
  { code: 'DE', name: 'DELAWARE' },
  { code: 'DC', name: 'DISTRICT OF COLUMBIA' },
  { code: 'FL', name: 'FLORIDA' },
  { code: 'GA', name: 'GEORGIA' },
  { code: 'HI', name: 'HAWAII' },
  { code: 'ID', name: 'IDAHO' },
  { code: 'IL', name: 'ILLINOIS' },
  { code: 'IN', name: 'INDIANA' },
  { code: 'IA', name: 'IOWA' },
  { code: 'KS', name: 'KANSAS' },
  { code: 'KY', name: 'KENTUCKY' },
  { code: 'LA', name: 'LOUISIANA' },
  { code: 'ME', name: 'MAINE' },
  { code: 'MD', name: 'MARYLAND' },
  { code: 'MA', name: 'MASSACHUSETTS' },
  { code: 'MI', name: 'MICHIGAN' },
  { code: 'MN', name: 'MINNESOTA' },
  { code: 'MS', name: 'MISSISSIPPI' },
  { code: 'MO', name: 'MISSOURI' },
  { code: 'MT', name: 'MONTANA' },
  { code: 'NE', name: 'NEBRASKA' },
  { code: 'NV', name: 'NEVADA' },
  { code: 'NH', name: 'NEW HAMPSHIRE' },
  { code: 'NJ', name: 'NEW JERSEY' },
  { code: 'NM', name: 'NEW MEXICO' },
  { code: 'NY', name: 'NEW YORK' },
  { code: 'NC', name: 'NORTH CAROLINA' },
  { code: 'ND', name: 'NORTH DAKOTA' },
  { code: 'OH', name: 'OHIO' },
  { code: 'OK', name: 'OKLAHOMA' },
  { code: 'OR', name: 'OREGON' },
  { code: 'PA', name: 'PENNSYLVANIA' },
  { code: 'RI', name: 'RHODE ISLAND' },
  { code: 'SC', name: 'SOUTH CAROLINA' },
  { code: 'SD', name: 'SOUTH DAKOTA' },
  { code: 'TN', name: 'TENNESSEE' },
  { code: 'TX', name: 'TEXAS' },
  { code: 'UT', name: 'UTAH' },
  { code: 'VT', name: 'VERMONT' },
  { code: 'VA', name: 'VIRGINIA' },
  { code: 'WA', name: 'WASHINGTON' },
  { code: 'WV', name: 'WEST VIRGINIA' },
  { code: 'WI', name: 'WISCONSIN' },
  { code: 'WY', name: 'WYOMING' },
  // Territories and the Canadian provinces these auctions also list.
  { code: 'PR', name: 'PUERTO RICO' },
  { code: 'GU', name: 'GUAM' },
  { code: 'VI', name: 'VIRGIN ISLANDS' },
  { code: 'AB', name: 'ALBERTA' },
  { code: 'BC', name: 'BRITISH COLUMBIA' },
  { code: 'MB', name: 'MANITOBA' },
  { code: 'NB', name: 'NEW BRUNSWICK' },
  { code: 'NL', name: 'NEWFOUNDLAND' },
  { code: 'NS', name: 'NOVA SCOTIA' },
  { code: 'ON', name: 'ONTARIO' },
  { code: 'QC', name: 'QUEBEC' },
  { code: 'SK', name: 'SASKATCHEWAN' },
];

const BY_CODE = new Map(US_STATES.map((s) => [s.code, s]));
const BY_NAME = new Map(US_STATES.map((s) => [s.name.replace(/[^A-Z]/g, ''), s]));

/**
 * Reduce a label to its state code, so "AK", "Alaska" and "Alaska (AK)" all
 * compare equal. Returns null when the label names no state we know.
 */
export function toStateCode(label: string | null | undefined): string | null {
  if (!label) return null;
  const upper = String(label).toUpperCase();

  // A bare code, which is what a city prefix and many dropdowns give.
  const trimmed = upper.trim();
  if (BY_CODE.has(trimmed)) return trimmed;

  // A full name, ignoring spaces and punctuation.
  const lettersOnly = upper.replace(/[^A-Z]/g, '');
  const byName = BY_NAME.get(lettersOnly);
  if (byName) return byName.code;

  // A code embedded in the label, as in "Alaska (AK)" or "AK - Anchorage".
  const embedded = upper.match(/\b([A-Z]{2})\b/g) || [];
  for (const candidate of embedded) {
    if (BY_CODE.has(candidate)) return candidate;
  }

  return null;
}
