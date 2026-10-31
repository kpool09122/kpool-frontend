import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("site-management contacts list BFF", () => {
  it("forwards only supported list filters to the versioned backend endpoint", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ contacts: [], current_page: 2, last_page: 2, total: 51, per_page: 50 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("http://localhost/api/site-management/contacts?hasReply=0&page=2&perPage=50&principalIdentifier=untrusted", { headers: { Cookie: "session=test", "Accept-Language": "ja" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ total: 51 });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.test/api/v1/site-management/contacts?hasReply=0&page=2&perPage=50", expect.objectContaining({ headers: expect.objectContaining({ Cookie: "session=test", "Accept-Language": "ja" }) }));
  });

  it("preserves the backend localized ProblemDetails explanation", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "Access denied", code: "unauthorized" }, { status: 403 })));
    const response = await GET(new NextRequest("http://localhost/api/site-management/contacts"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ detail: "Access denied", code: "unauthorized", message: "Access denied" });
  });
});
