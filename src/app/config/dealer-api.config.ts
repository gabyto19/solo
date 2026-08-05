/**
 * LionTrans / PayAuto dealer API configuration.
 *
 * SECURITY NOTE: this is a static browser app, so anything placed here is
 * compiled into the JavaScript bundle and is readable by anyone who opens the
 * site. Treat `dealerId` / `apiKey` as public once they are set below.
 *
 * If the key must stay secret, move the calls behind a small server-side proxy
 * (e.g. a Vercel serverless function) and point `baseUrl` at that proxy instead
 * — the rest of the code needs no changes.
 */
export const DEALER_API = {
  /** Upstream API root. Point this at a proxy if the key must stay private. */
  baseUrl: 'https://apidealer.payauto.de/api/ApiForDealers',

  /** Supplied by LionTrans. Sent as query params on the priced endpoints. */
  dealerId: '14844',
  apiKey: 'bl3NsbeJWAZ7doFN/9Z4edeStJCeUYAg5d03WwBTO3I=',
};

/** True when credentials are present, so the UI can explain why calls fail. */
export function hasDealerCredentials(): boolean {
  return !!DEALER_API.dealerId && !!DEALER_API.apiKey;
}
