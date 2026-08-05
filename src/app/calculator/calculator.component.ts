import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DealerApiService, DropDownItem, CalculatorQuery } from '../services/dealer-api.service';
import { hasDealerCredentials } from '../config/dealer-api.config';

/** One line of the rendered result table. */
interface ResultRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-calculator',
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.css',
})
export class CalculatorComponent implements OnInit {
  auctions: DropDownItem[] = [];
  states: DropDownItem[] = [];
  cities: DropDownItem[] = [];
  carTypes: DropDownItem[] = [];
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

  /** Lot lookup (IAAI / Copart) fills in nothing automatically — it only shows
   *  what the auction knows about the lot, next to the price result. */
  lot = '';
  lotSource: 'iaai' | 'copart' = 'iaai';
  lotResult: ResultRow[] = [];
  lotRaw: any = null;
  lotLoading = false;

  loadingOptions = true;
  loadingCities = false;
  calculating = false;

  error = '';
  lotError = '';
  credentialsMissing = !hasDealerCredentials();

  resultRows: ResultRow[] = [];
  serviceRows: ResultRow[] = [];
  rawResult: any = null;
  showRaw = false;

  constructor(private api: DealerApiService) {}

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
        this.auctions = res.auctions;
        this.states = res.states;
        this.carTypes = res.carTypes;
        this.internationalPorts = res.internationalPorts;
        this.deliveryPorts = res.deliveryPorts;
        this.loadingOptions = false;
      },
      error: (err) => {
        this.error = this.describeError(err);
        this.loadingOptions = false;
      },
    });
  }

  onAuctionChange(): void {
    this.form.auctionCityId = '';
    this.cities = [];
    if (!this.form.auctionId) return;

    this.loadingCities = true;
    this.api.getAuctionCities(this.form.auctionId).subscribe({
      next: (cities) => {
        this.cities = cities;
        this.loadingCities = false;
      },
      error: (err) => {
        this.error = this.describeError(err);
        this.loadingCities = false;
      },
    });
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
    this.resultRows = [];
    this.serviceRows = [];
    this.rawResult = null;

    // Both endpoints describe the same route; ServicePrices additionally takes
    // a delivery port. Request them together so the result shows the full cost.
    forkJoin({
      calculator: this.api.getCalculatorData(this.form),
      services: this.api.getServicePrices(this.form),
    }).subscribe({
      next: (res) => {
        this.rawResult = res;
        this.resultRows = this.flatten(res.calculator);
        this.serviceRows = this.flatten(res.services);
        this.calculating = false;
      },
      error: (err) => {
        this.error = this.describeError(err);
        this.calculating = false;
      },
    });
  }

  lookupLot(): void {
    const lot = this.lot.trim();
    if (!lot) return;

    this.lotLoading = true;
    this.lotError = '';
    this.lotResult = [];
    this.lotRaw = null;

    const call =
      this.lotSource === 'iaai'
        ? this.api.parseCarFromIAAI(this.form.carTypeId, lot)
        : this.api.parseCarFromCopart(this.form.carTypeId, lot);

    call.subscribe({
      next: (res) => {
        this.lotRaw = res;
        this.lotResult = this.flatten(res);
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
    this.cities = [];
    this.resultRows = [];
    this.serviceRows = [];
    this.rawResult = null;
    this.error = '';
  }

  /**
   * The response shape is not documented in the exported collection, so the
   * result is rendered generically: every scalar field becomes a labelled row.
   * This displays correct data whatever the field names turn out to be.
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
      return 'სერვერთან კავშირი ვერ დამყარდა. სავარაუდოდ CORS-ის შეზღუდვაა — API უნდა უშვებდეს ამ დომენს, ან საჭიროა proxy.';
    }
    if (err?.status === 401 || err?.status === 403) {
      return 'ავტორიზაცია ვერ მოხერხდა — შეამოწმეთ dealerId და apiKey.';
    }
    if (err?.status) {
      return `API-მ დააბრუნა შეცდომა ${err.status}. ${err?.error?.message || err?.message || ''}`.trim();
    }
    return err?.message || 'უცნობი შეცდომა.';
  }
}
