import { requestIdentity, type IdentityBrowserApiResult } from "./identityBrowserRequest";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import { parseAuthenticatedIdentitySummary } from "./identityApi";

import { schemas, consentDetailsSchema, consentContinuationSchema, parseOAuthQuery, type ConsentDetails, type ConsentScope } from "./oauthConsentContract";
export type { ConsentDetails, ConsentScope } from "./oauthConsentContract";
const base = "/api/identity/oauth/requests";
const get = (id: string, language?: string) => requestIdentity(`${base}/${encodeURIComponent(id)}`,
  (body) => parseWithSchemaLog("OAuth consent details", consentDetailsSchema, body), { method: "GET", language });
export const oauthConsentBrowserApi = {
  start: async (query: string, language?: string): Promise<IdentityBrowserApiResult<ConsentDetails>> => {
    const body = parseOAuthQuery(query);
    if (!body) return { ok: false, status: 422, message: "" };
    const identity = await requestIdentity("/api/identity/auth/me", parseAuthenticatedIdentitySummary, { method: "GET", language });
    if (!identity.ok) return identity;
    // Always acquire a fresh token after login rather than relying on a pre-login CSRF cookie.
    const csrf = await requestIdentity("/api/identity/auth/csrf-token", () => null, { method: "GET", language });
    if (!csrf.ok) return csrf;
    const pending = await requestIdentity(base,
      (value) => parseWithSchemaLog("OAuth pending request", schemas.PendingAuthorizationResult.strip(), value), { body, language });
    if (!pending.ok) return pending;
    return get(pending.data.requestIdentifier, language);
  },
  get,
  approve: (id: string, scopes: ConsentScope[], language?: string) => requestIdentity(`${base}/${encodeURIComponent(id)}/approve`,
    (body) => parseWithSchemaLog("OAuth continuation", consentContinuationSchema, body), { body: { scopes }, language }),
  deny: (id: string, language?: string) => requestIdentity(`${base}/${encodeURIComponent(id)}/deny`,
    (body) => parseWithSchemaLog("OAuth continuation", consentContinuationSchema, body), { language }),
};
export type OAuthConsentBrowserApi = typeof oauthConsentBrowserApi;
