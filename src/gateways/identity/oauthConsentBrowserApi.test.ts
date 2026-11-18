import { afterEach, describe, expect, it, vi } from "vitest";
import { oauthConsentBrowserApi } from "./oauthConsentBrowserApi";
import { parseOAuthQuery } from "./oauthConsentContract";
import { identityApiTypes } from "@kpool/types";

// The generated alias used to erase the detail fields inherited from TypeSpec.
describe("OAuth consent contract", () => {
  it("requires and retains the authoritative consent candidates and client name", () => {
    const detail = { requestIdentifier: "request-1", expiresAt: "2026-12-01T00:00:00Z", clientName: "ChatGPT", scopes: [{ scope: "wiki:read", description: "公開 Wiki の取得" }] };
    const parsed = identityApiTypes.schemas.AuthorizationRequestResult.safeParse(detail);
    expect(parsed.success && parsed.data).toEqual(detail);
    expect(identityApiTypes.schemas.AuthorizationRequestResult.safeParse({ requestIdentifier: "request-1", expiresAt: detail.expiresAt }).success).toBe(false);
  });
});

const params = new URLSearchParams({ client_id: "00000000-0000-4000-8000-000000000001", redirect_uri: "https://client.example/callback", scope: "wiki:read wiki-drafts:write", resource: "https://api.example/mcp", code_challenge: "pkce+opaque/=", code_challenge_method: "S256", response_type: "code", state: "opaque + &=雪" });
const identity = { identityIdentifier: "identity", identityName: "member", email: "member@example.com", language: "ja", profileImage: null, accountIdentifier: "22222222-2222-4222-8222-222222222222", accountPrincipalIdentifier: "33333333-3333-4333-8333-333333333333", accountPrincipalStatus: "active", siteManagementPrincipalStatus: "active", accountType: "individual", accountPolicies: [], accountIdentityCount: 1, originalAccount: null, delegationIdentifier: null, switchableAccounts: [], account: { accountIdentifier: "account", name: "Account", email: "member@example.com", type: "individual", status: "active", accountCategory: "general" } };
afterEach(() => { vi.unstubAllGlobals(); document.cookie = "XSRF-TOKEN=; Max-Age=0; Path=/"; });
describe("OAuth browser flow", () => {
  it("maps every OAuth parameter without changing opaque state or PKCE", () => {
    expect(parseOAuthQuery(params.toString())).toEqual({ clientIdentifier: params.get("client_id"), redirectUri: params.get("redirect_uri"), scopes: ["wiki:read", "wiki-drafts:write"], resource: params.get("resource"), codeChallenge: params.get("code_challenge"), codeChallengeMethod: "S256", responseType: "code", state: params.get("state") });
    expect(parseOAuthQuery(params.toString() + "&state=duplicate")).toBeNull();
    const invalid = new URLSearchParams(params); invalid.set("scope", "unknown"); expect(parseOAuthQuery(invalid.toString())).toBeNull();
  });
  it("authenticates then gets fresh CSRF, creates and reads the returned ID without switching accounts", async () => {
    const detail = { requestIdentifier: "opaque-id", expiresAt: "2026-12-01T00:00:00Z", clientName: "ChatGPT", scopes: [] };
    const calls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input); calls.push(url);
      if (url.endsWith("/me")) return Response.json(identity);
      if (url.endsWith("/csrf-token")) { document.cookie = "XSRF-TOKEN=fresh-token; Path=/"; return new Response(null, { status: 204 }); }
      if (url.endsWith("/opaque-id")) return Response.json(detail);
      return Response.json({ requestIdentifier: "opaque-id", expiresAt: detail.expiresAt }, { status: 201 });
    }); vi.stubGlobal("fetch", fetchMock);
    expect(await oauthConsentBrowserApi.start(params.toString(), "ko")).toEqual({ ok: true, data: detail });
    expect(calls).toEqual(["/api/identity/auth/me", "/api/identity/auth/csrf-token", "/api/identity/oauth/requests", "/api/identity/oauth/requests/opaque-id"]);
    expect(fetchMock.mock.calls[2]).toEqual(["/api/identity/oauth/requests", expect.objectContaining({ credentials: "include", headers: expect.objectContaining({ "X-XSRF-TOKEN": "fresh-token", "Accept-Language": "ko" }), body: JSON.stringify(parseOAuthQuery(params.toString())) })]);
  });
  it("never creates a request before login or when authentication has a network error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 })); vi.stubGlobal("fetch", fetchMock);
    expect(await oauthConsentBrowserApi.start(params.toString())).toMatchObject({ ok: false, status: 401 });
    expect(fetchMock).toHaveBeenCalledOnce();
    fetchMock.mockRejectedValue(new Error("network")); expect(await oauthConsentBrowserApi.start(params.toString())).toMatchObject({ ok: false, status: 0 });
  });
  it("rejects invalid input without making requests", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect(await oauthConsentBrowserApi.start("state=only")).toMatchObject({ ok: false, status: 422 }); expect(fetchMock).not.toHaveBeenCalled();
  });
});
