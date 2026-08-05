import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DEALER_API } from '../config/dealer-api.config';

/** A single option in one of the API's dropdown endpoints. */
export interface DropDownItem {
  id: any;
  name: string;
}

/** Everything the price/calculator endpoints need to identify a route. */
export interface CalculatorQuery {
  auctionId: any;
  stateId: any;
  auctionCityId: any;
  carTypeId: any;
  internationalPortId: any;
  deliveryPortId?: any;
  title?: any;
}

/**
 * The exported Postman collection carries no saved example responses, so the
 * exact JSON field names are unverified. These helpers accept the shapes such
 * .NET APIs commonly return — PascalCase, camelCase, or value/text pairs — and
 * normalise them. Once a real response is known this can be tightened to the
 * one true shape.
 */
function unwrapArray(body: any): any[] {
  if (Array.isArray(body)) return body;
  for (const key of ['data', 'items', 'result', 'results', 'value']) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return [];
}

function normaliseItem(raw: any): DropDownItem {
  if (raw === null || raw === undefined) return { id: null, name: '' };
  if (typeof raw === 'string' || typeof raw === 'number') {
    return { id: raw, name: String(raw) };
  }
  const id =
    raw.id ?? raw.Id ?? raw.ID ?? raw.value ?? raw.Value ?? raw.key ?? raw.Key;
  const name =
    raw.name ?? raw.Name ?? raw.text ?? raw.Text ?? raw.title ?? raw.Title ??
    raw.label ?? raw.Label ?? raw.description ?? raw.Description ?? String(id ?? '');
  return { id, name: String(name) };
}

@Injectable({ providedIn: 'root' })
export class DealerApiService {
  constructor(private http: HttpClient) {}

  private url(endpoint: string): string {
    return `${DEALER_API.baseUrl}/${endpoint}`;
  }

  /** Query params carrying the dealer credentials, required by priced calls. */
  private authParams(): HttpParams {
    return new HttpParams()
      .set('dealerId', DEALER_API.dealerId)
      .set('apiKey', DEALER_API.apiKey);
  }

  private dropdown(endpoint: string, params?: HttpParams): Observable<DropDownItem[]> {
    return this.http
      .get<any>(this.url(endpoint), { params })
      .pipe(map((body) => unwrapArray(body).map(normaliseItem)));
  }

  // ── Dropdown sources (no credentials required) ────────────────────

  getAuctions(): Observable<DropDownItem[]> {
    return this.dropdown('AuctionsDropDownForDealerApi');
  }

  getStates(): Observable<DropDownItem[]> {
    return this.dropdown('StatesDropDownForDealerApi');
  }

  /** Cities depend on the chosen auction, so this reloads on every change. */
  getAuctionCities(auctionId: any): Observable<DropDownItem[]> {
    return this.dropdown(
      'AuctionCitiesDropDownForDealerApi',
      new HttpParams().set('auctionId', String(auctionId ?? ''))
    );
  }

  getCarTypes(): Observable<DropDownItem[]> {
    return this.dropdown('CarTypesDropDownForDealerApi');
  }

  getInternationalPorts(): Observable<DropDownItem[]> {
    return this.dropdown('GetInternationalPortsDropDownForDealerApi');
  }

  getDeliveryPorts(): Observable<DropDownItem[]> {
    return this.dropdown('DeliveryPortsDropDownForDealerApi');
  }

  // ── Priced calls (credentials required) ───────────────────────────

  private queryParams(q: CalculatorQuery, includeDeliveryPort: boolean): HttpParams {
    let params = this.authParams()
      .set('auctionId', String(q.auctionId ?? ''))
      .set('stateId', String(q.stateId ?? ''))
      .set('auctionCityId', String(q.auctionCityId ?? ''))
      .set('carTypeId', String(q.carTypeId ?? ''))
      .set('internationalPortId', String(q.internationalPortId ?? ''));

    // Only ServicePrices accepts deliveryPortId; GetCalculatorData does not.
    if (includeDeliveryPort) {
      params = params.set('deliveryPortId', String(q.deliveryPortId ?? ''));
    }
    if (q.title !== undefined && q.title !== null && q.title !== '') {
      params = params.set('title', String(q.title));
    }
    return params;
  }

  getServicePrices(q: CalculatorQuery): Observable<any> {
    return this.http.get<any>(this.url('ServicePricesForDealerApi'), {
      params: this.queryParams(q, true),
    });
  }

  getCalculatorData(q: CalculatorQuery): Observable<any> {
    return this.http.get<any>(this.url('GetCalculatorDataForDealerApi'), {
      params: this.queryParams(q, false),
    });
  }

  // ── Lot lookup ────────────────────────────────────────────────────

  parseCarFromIAAI(carTypeId: any, lot: string): Observable<any> {
    return this.http.get<any>(this.url('ParseCarFromIAAIForDealerApi'), {
      params: this.authParams()
        .set('carTypeId', String(carTypeId ?? ''))
        .set('lot', lot),
    });
  }

  parseCarFromCopart(carTypeId: any, lot: string): Observable<any> {
    return this.http.get<any>(this.url('ParseCarFromCopartForDealerApi'), {
      params: this.authParams()
        .set('carTypeId', String(carTypeId ?? ''))
        .set('lot', lot),
    });
  }
}
