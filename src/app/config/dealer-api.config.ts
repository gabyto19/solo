/**
 * LionTrans / PayAuto dealer API configuration.
 *
 * Requests go through this app's own serverless proxy at /api/dealer/*, which
 * attaches dealerId and apiKey server-side from environment variables. The
 * credentials are therefore never part of the browser bundle, and because the
 * proxy is same-origin there is no CORS involved either.
 *
 * Set DEALER_ID and DEALER_API_KEY in the Vercel project's environment.
 */
export const DEALER_API = {
  /** Same-origin proxy. The upstream host is configured in api/dealer/. */
  baseUrl: '/api/dealer',
};
