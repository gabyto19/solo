import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DealerApiService, DropDownItem, CalculatorQuery } from '../services/dealer-api.service';
import { AuthService } from '../services/auth.service';
import { toStateCode, cityLabelStateCode } from '../services/us-states';

/** One line of the rendered result table. */
interface ResultRow {
  label: string;
  value: string;
}

/**
 * The upstream lists carry far more options than this business uses, so both
 * are narrowed to the ones actually offered.
 *
 * An option passes when every token of any one group appears in its label.
 * Matching on words rather than equality lets "ACV" and "ACV Auctions" both
 * pass; requiring the country as well is what separates POTI GEORGIA from the
 * POTI ARMENIA and POTI AZERBAIJAN entries the same list carries.
 */
const ALLOWED_AUCTIONS = [['copart'], ['iaai'], ['manheim'], ['acv']];
const ALLOWED_DELIVERY_PORTS = [['poti', 'georgia'], ['batumi', 'georgia']];

function matchesAny(name: string, groups: string[][]): boolean {
  const lower = String(name || '').toLowerCase();
  return groups.some((group) =>
    group.every((token) => new RegExp(`\\b${token}\\b`).test(lower))
  );
}

/**
 * Names the total may arrive under, most specific first. Kept in step with
 * TOTAL_KEYS in api/_lib/pricing.ts, which marks up the same field.
 */
const TOTAL_KEYS = ['totalprice', 'total', 'totalcost', 'grandtotal', 'finalprice', 'sumprice'];

/**
 * The four prices an administrator sees after a calculation, in display order,
 * with the API field each comes from.
 *
 * titlePrice and internalTransportationPrice are confirmed; the delivery and
 * total fields are not, so several conventional spellings are accepted for
 * them. Keys are compared with case and punctuation removed.
 */
const PRICE_FIELDS: ReadonlyArray<{ label: string; keys: string[] }> = [
  { label: 'Title-ის ფასი', keys: ['titleprice'] },
  {
    label: 'ინტერნაციონალური ტრანსპორტირების ფასი',
    keys: ['internaltransportationprice', 'internationaltransportationprice'],
  },
  {
    label: 'ჩამოყვანის ფასი',
    keys: [
      'deliveryprice', 'deliverycost', 'shippingprice', 'shippingcost',
      'transportationprice', 'oceanfreight', 'freightprice', 'seafreight',
    ],
  },
  { label: 'ჯამში ფასი', keys: TOTAL_KEYS },
];

/**
 * What a `user` sees instead: the one all-in figure, under the name the
 * customer is quoted. The breakdown behind it is internal, and the proxy
 * already withholds it — this list is what turns the remaining field into a
 * row, not what hides the others.
 */
const USER_PRICE_FIELDS: ReadonlyArray<{ label: string; keys: string[] }> = [
  { label: 'ტრანსპორტირების ფასი', keys: TOTAL_KEYS },
];

const normaliseKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

@Component({
  selector: 'app-calculator',
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.css',
})
export class CalculatorComponent implements OnInit {
  auctions: DropDownItem[] = [];
  states: DropDownItem[] = [];
  carTypes: DropDownItem[] = [];

  /** Every city the chosen auction serves, before the state narrows it down. */
  private allCities: DropDownItem[] = [];
  /** What the city dropdown actually offers: allCities, narrowed by state. */
  cities: DropDownItem[] = [];
  /** Set when the state could not be matched to any city, so the list is unfiltered. */
  cityFilterUnavailable = false;
  /** Set when an allowlist matched nothing, so that list is shown in full. */
  restrictionFailed = false;
  internationalPorts: DropDownItem[] = [];
  deliveryPorts: DropDownItem[] = [];

  form: CalculatorQuery = {
    auctionId: '',
    stateId: '',
    auctionCityId: '',
    carTypeId: '',
    internationalPortId: '',
    deliveryPortId: '',
    title: '',
  };

  /**
   * Lot lookup (IAAI / Copart). It carries its own car type rather than
   * borrowing the one above: the block reads as independent, and taking the
   * form's value silently sent an empty carTypeId — which the upstream API
   * rejects with a 400 — whenever the lot was searched first.
   */
  lot = '';
  lotSource: 'iaai' | 'copart' = 'iaai';
  lotCarTypeId: any = '';
  lotResult: ResultRow[] = [];
  lotLoading = false;

  loadingOptions = true;
  loadingCities = false;
  calculating = false;

  error = '';
  lotError = '';

  serviceRows: ResultRow[] = [];

  constructor(private api: DealerApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.loadOptions();
  }

  /** All credential-free dropdowns load together on first paint. */
  private loadOptions(): void {
    this.loadingOptions = true;
    this.error = '';

    forkJoin({
      auctions: this.api.getAuctions(),
      states: this.api.getStates(),
      carTypes: this.api.getCarTypes(),
      internationalPorts: this.api.getInternationalPorts(),
      deliveryPorts: this.api.getDeliveryPorts(),
    }).subscribe({
      next: (res) => {
        this.auctions = this.restrict(res.auctions, ALLOWED_AUCTIONS);
        this.states = res.states;
        this.carTypes = res.carTypes;
        this.internationalPorts = res.internationalPorts;
        this.deliveryPorts = this.restrict(res.deliveryPorts, ALLOWED_DELIVERY_PORTS);
        this.loadingOptions = false;
      },
      error: (err) => {
        this.error = this.describeError(err);
        this.loadingOptions = false;
      },
    });
  }

  /**
   * Keep only the allowed options. If none match, the labelling has changed
   * upstream — keep the full list rather than leaving a dropdown that cannot
   * be used at all, and say so on the page instead of failing silently.
   */
  private restrict(items: DropDownItem[], groups: string[][]): DropDownItem[] {
    const kept = items.filter((item) => matchesAny(item.name, groups));
    if (kept.length === 0 && items.length > 0) {
      this.restrictionFailed = true;
      return items;
    }
    return kept;
  }

  onAuctionChange(): void {
    this.form.auctionCityId = '';
    this.allCities = [];
    this.cities = [];
    if (!this.form.auctionId) return;

    this.loadingCities = true;
    this.api.getAuctionCities(this.form.auctionId).subscribe({
      next: (cities) => {
        this.allCities = cities;
        this.applyStateFilter();
        this.loadingCities = false;
      },
      error: (err) => {
        this.error = this.describeError(err);
        this.loadingCities = false;
      },
    });
  }

  onStateChange(): void {
    this.applyStateFilter();
  }

  /** Narrow the city list to the chosen state, dropping a now-invalid choice. */
  private applyStateFilter(): void {
    const state = this.states.find((s) => String(s.id) === String(this.form.stateId));

    if (!state) {
      this.cities = this.allCities;
      this.cityFilterUnavailable = false;
    } else {
      const matched = this.allCities.filter((c) => this.cityBelongsToState(c, state));
      // An empty dropdown would be a dead end, so fall back to the full list
      // and say so rather than silently pretending the filter worked.
      this.cityFilterUnavailable = matched.length === 0 && this.allCities.length > 0;
      this.cities = this.cityFilterUnavailable ? this.allCities : matched;
    }

    if (!this.cities.some((c) => String(c.id) === String(this.form.auctionCityId))) {
      this.form.auctionCityId = '';
    }
  }

  /**
   * Whether a city sits in the given state.
   *
   * The API returns cities as a bare label — {"id":16,"name":"AK - Anchorage"}
   * — with no state field, so the code in the name is the only link. Both
   * sides are reduced to a state code before comparing, which also covers a
   * states endpoint that answers with full names rather than codes.
   */
  private cityBelongsToState(city: DropDownItem, state: DropDownItem): boolean {
    const stateCode = toStateCode(state.name);
    if (!stateCode) return false;

    const raw = city.raw;
    if (raw && typeof raw === 'object') {
      const stateId = raw.stateId ?? raw.StateId ?? raw.stateID ?? raw.StateID;
      // A city that carries a state id settles the question either way.
      if (stateId !== undefined && stateId !== null && stateId !== '') {
        return String(stateId) === String(state.id);
      }

      const stateText =
        raw.state ?? raw.State ?? raw.stateName ?? raw.StateName ??
        raw.stateCode ?? raw.StateCode ?? raw.stateAbbr ?? raw.StateAbbr;
      if (stateText) return toStateCode(String(stateText)) === stateCode;
    }

    // Each auction labels its locations differently, so the code is looked for
    // in every position one conventionally appears in.
    return cityLabelStateCode(city.name) === stateCode;
  }

  get canCalculate(): boolean {
    return (
      !!this.form.auctionId &&
      !!this.form.stateId &&
      !!this.form.auctionCityId &&
      !!this.form.carTypeId &&
      !!this.form.internationalPortId &&
      !this.calculating
    );
  }

  calculate(): void {
    if (!this.canCalculate) return;

    this.calculating = true;
    this.error = '';
    this.serviceRows = [];

    // Only ServicePrices is requested. GetCalculatorData describes the same
    // route but its output is no longer displayed, and calling it would spend
    // dealer API quota for nothing.
    this.api.getServicePrices(this.form).subscribe({
      next: (res) => {
        this.serviceRows = this.toPriceRows(res);
        this.calculating = false;
      },
      error: (err) => {
        this.error = this.describeError(err);
        this.calculating = false;
      },
    });
  }

  get canLookupLot(): boolean {
    return !!this.lot.trim() && !!this.lotCarTypeId && !this.lotLoading;
  }

  lookupLot(): void {
    if (!this.canLookupLot) return;
    const lot = this.lot.trim();

    this.lotLoading = true;
    this.lotError = '';
    this.lotResult = [];

    const call =
      this.lotSource === 'iaai'
        ? this.api.parseCarFromIAAI(this.lotCarTypeId, lot)
        : this.api.parseCarFromCopart(this.lotCarTypeId, lot);

    call.subscribe({
      next: (res) => {
        this.lotResult = this.toPriceRows(res);
        this.lotLoading = false;
      },
      error: (err) => {
        this.lotError = this.describeError(err);
        this.lotLoading = false;
      },
    });
  }

  reset(): void {
    this.form = {
      auctionId: '',
      stateId: '',
      auctionCityId: '',
      carTypeId: '',
      internationalPortId: '',
      deliveryPortId: '',
      title: '',
    };
    this.allCities = [];
    this.cities = [];
    this.cityFilterUnavailable = false;
    this.serviceRows = [];
    this.error = '';

    // The lot panel is part of the same result, so it clears with everything else.
    this.lot = '';
    this.lotCarTypeId = '';
    this.lotResult = [];
    this.lotError = '';
  }

  /**
   * Reduce a response to the prices this account is shown, labelled in
   * Georgian — the four-line breakdown for an administrator, the single
   * all-in figure for everyone else.
   *
   * Falls back to showing the response as-is when none of the fields are
   * recognised, so an unexpected shape leaves a readable result instead of an
   * empty panel.
   */
  private toPriceRows(body: any): ResultRow[] {
    const found = new Map<string, string>();
    const collect = (value: any) => {
      if (!value || typeof value !== 'object') return;
      for (const [key, inner] of Object.entries(value)) {
        if (inner && typeof inner === 'object') collect(inner);
        else if (inner !== null && inner !== undefined && inner !== '') {
          found.set(normaliseKey(key), String(inner));
        }
      }
    };
    collect(body);

    const rows: ResultRow[] = [];
    for (const field of this.auth.isAdmin ? PRICE_FIELDS : USER_PRICE_FIELDS) {
      const key = field.keys.find((k) => found.has(k));
      if (key) rows.push({ label: field.label, value: found.get(key)! });
    }

    return rows.length ? rows : this.flatten(body);
  }

  /**
   * The response shape is not documented in the exported collection, so the
   * result is rendered generically: every scalar field becomes a labelled row.
   * Used only when none of the known price fields are present.
   */
  private flatten(body: any, prefix = ''): ResultRow[] {
    if (body === null || body === undefined) return [];
    if (typeof body !== 'object') {
      return [{ label: prefix || 'შედეგი', value: String(body) }];
    }

    const rows: ResultRow[] = [];
    const entries = Array.isArray(body)
      ? body.map((v, i) => [String(i + 1), v] as [string, any])
      : Object.entries(body);

    for (const [key, value] of entries) {
      const label = prefix ? `${prefix} · ${key}` : key;
      if (value === null || value === undefined || value === '') continue;
      if (typeof value === 'object') {
        rows.push(...this.flatten(value, label));
      } else {
        rows.push({ label, value: String(value) });
      }
    }
    return rows;
  }

  private describeError(err: any): string {
    if (err?.status === 0) {
      return 'სერვერთან კავშირი ვერ დამყარდა.';
    }
    if (err?.status === 401) {
      return 'სესია ამოიწურა — გაიარეთ ავტორიზაცია ხელახლა.';
    }
    if (err?.status === 502) {
      return 'ტრანსპორტის API დროებით მიუწვდომელია. სცადეთ მოგვიანებით.';
    }
    if (err?.status) {
      // The proxy passes the upstream body through verbatim, which may be a
      // plain string rather than JSON — otherwise the reason is lost.
      const detail =
        err?.error?.error ||
        err?.error?.message ||
        (typeof err?.error === 'string' ? err.error.slice(0, 200) : '');
      return detail || `შეცდომა ${err.status}.`;
    }
    return err?.message || 'უცნობი შეცდომა.';
  }
}
