import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DealerApiService, DropDownItem, CalculatorQuery } from '../services/dealer-api.service';

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
    this.serviceRows = [];

    // Only ServicePrices is requested. GetCalculatorData describes the same
    // route but its output is no longer displayed, and calling it would spend
    // dealer API quota for nothing.
    this.api.getServicePrices(this.form).subscribe({
      next: (res) => {
        this.serviceRows = this.flatten(res);
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
    this.serviceRows = [];
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
