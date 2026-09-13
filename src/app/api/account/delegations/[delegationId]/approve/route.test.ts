import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "./route";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const summary = { delegationIdentifier: id, affiliationIdentifier: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", delegateAccountIdentifier: "22222222-2222-4222-8222-222222222222", delegatorAccountIdentifier: "33333333-3333-4333-8333-333333333333", requestedByAccountIdentifier: "22222222-2222-4222-8222-222222222222", status: "approved", direction: "agency_to_talent", requestedAt: "2026-09-12T00:00:00Z", approvedAt: "2026-09-13T00:00:00Z", rejectedAt: null };
const request = () => new Request(`https://app.test/api/account/delegations/${id}/approve`, { method: "POST", headers: { cookie: "session=abc", "accept-language": "ja" } }) as NextRequest;
describe("delegation approve route", () => {
 afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
 it("forwards approval and parses the response", async () => { vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.test"); const f=vi.fn().mockResolvedValue(new Response(JSON.stringify(summary),{status:200})); vi.stubGlobal("fetch",f); const r=await POST(request(),{params:Promise.resolve({delegationId:id})}); expect(f).toHaveBeenCalledWith(`https://account.test/api/account/delegations/${id}/approve`,{method:"POST",headers:{Accept:"application/json","Accept-Language":"ja",Cookie:"session=abc"},cache:"no-store"}); expect(r.status).toBe(200); await expect(r.json()).resolves.toEqual(summary); });
 it("preserves client errors and hides backend server details", async () => { vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.test"); vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({message:"secret"}),{status:500}))); const r=await POST(request(),{params:Promise.resolve({delegationId:id})}); expect(r.status).toBe(500); await expect(r.json()).resolves.toEqual({message:"Account API is temporarily unavailable."}); });
});
