import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

const identifier = "019a1234-5678-7000-8000-111111111111";
const context = { params: Promise.resolve({ contactIdentifier: identifier }) };

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("site-management contact reply BFF", () => {
  it("forwards an anonymous contact reply with CSRF but no owner and preserves the no-content response", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { "Set-Cookie": "session=renewed; HttpOnly" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(new NextRequest(`http://localhost/api/site-management/contacts/${identifier}/replies`, { method: "POST", headers: { Cookie: "session=test", "X-XSRF-TOKEN": "csrf" }, body: JSON.stringify({ content: "Reply" }) }), context);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Set-Cookie")).toBe("session=renewed; HttpOnly");
    expect(fetchMock).toHaveBeenCalledWith(`http://backend.test/api/v1/site-management/contacts/${identifier}/replies`, expect.objectContaining({ method: "POST", body: '{"content":"Reply"}', headers: expect.objectContaining({ Cookie: "session=test", "X-XSRF-TOKEN": "csrf" }) }));
  });
});
