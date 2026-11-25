import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxySnapshot } from "./snapshotProxy";
import { snapshotSchemas } from "@/gateways/account/accountSnapshotApi";
const id = "22222222-2222-4222-8222-222222222222";
describe("snapshot BFF", () => {
  it("streams only safe document formats inline through the authorized API", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://backend.test");
    const upstream = vi.fn().mockResolvedValue(new Response("file-content", { headers: { "Content-Type": "application/pdf", "Set-Cookie": "session=new" } }));
    vi.stubGlobal("fetch", upstream);
    const response = await proxySnapshot(new NextRequest("http://localhost/api/account/test", { headers: { Cookie: "session=old" } }), `account-snapshot-change-requests/${id}/documents/passport?source=original`, "document");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe("inline");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("set-cookie")).toContain("session=new");
    expect(await response.text()).toBe("file-content");
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("forwards auth, locale and CSRF, with no document payload on save", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://backend.test");
    const upstream = vi.fn().mockResolvedValue(Response.json({ snapshotIdentifier: id, accountIdentifier: id, status: "approved", savedAt: "2026-11-25T00:00:00Z" }, { headers: { "Set-Cookie": "session=new; HttpOnly" } }));
    vi.stubGlobal("fetch", upstream);
    const response = await proxySnapshot(new NextRequest("http://localhost/api/account/test", { method: "PUT", headers: { Cookie: "session=old", "Accept-Language": "ko", "X-XSRF-TOKEN": "token" } }), `accounts/${id}/snapshot`, snapshotSchemas.summary);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("session=new");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(upstream).toHaveBeenCalledWith(`https://backend.test/api/v1/account/accounts/${id}/snapshot`, expect.objectContaining({ method: "PUT", headers: expect.objectContaining({ Cookie: "session=old", "Accept-Language": "ko" }) }));
  });
  it.each([403,409,422,500])("sanitizes %i errors while retaining cookies and known error codes", async (status) => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://backend.test/api/v1/account");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "account_snapshot_change_requires_approval", detail: "safe validation", exception: "secret", trace: ["secret"] }, { status, headers: { "Set-Cookie": "session=new" } })));
    const response = await proxySnapshot(new NextRequest("http://localhost/test"), "accounts/x/snapshot", snapshotSchemas.summary);
    const body = await response.json();
    expect(body.exception).toBeUndefined(); expect(body.trace).toBeUndefined();
    if (status === 500) expect(body.message).not.toBe("safe validation");
    expect(response.headers.get("set-cookie")).toContain("session=new");
  });
  it("rejects invalid reasons before upstream calls", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://backend.test");
    const upstream = vi.fn(); vi.stubGlobal("fetch", upstream);
    const response = await proxySnapshot(new NextRequest("http://localhost/test", { method: "POST", body: JSON.stringify({ changeReason: "" }) }), "accounts/x/snapshot-change-requests", snapshotSchemas.change, snapshotSchemas.changeBody);
    expect(response.status).toBe(422); expect(upstream).not.toHaveBeenCalled();
  });
  it("keeps rotated cookies when a successful response is malformed", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { headers: { "Set-Cookie": "session=new" } })));
    const response = await proxySnapshot(new NextRequest("http://localhost/test"), "accounts/x/snapshot", snapshotSchemas.detail);
    expect(response.status).toBe(502); expect(response.headers.get("set-cookie")).toContain("session=new");
  });
});
