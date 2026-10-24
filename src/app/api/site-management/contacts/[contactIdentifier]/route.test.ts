import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

const identifier = "019a1234-5678-7000-8000-111111111111";
const context = { params: Promise.resolve({ contactIdentifier: identifier }) };

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("site-management contact detail BFF", () => {
  it("proxies anonymous detail without requiring or forwarding an owner", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const detail = { contactIdentifier: identifier, principalIdentifier: null, category: 1, name: "Sender", createdAt: "2026-10-08T00:00:00+00:00", content: "Inquiry", replies: [
      { replyIdentifier: identifier, content: "確認しました。", sentAt: "2026-10-09T00:00:00+00:00", principalIdentifier: identifier, name: "山田はるか" },
      { replyIdentifier: "019a1234-5678-7000-8000-222222222222", content: "以前の返信", sentAt: "2026-10-09T01:00:00+00:00", principalIdentifier: identifier, name: null },
      { replyIdentifier: "019a1234-5678-7000-8000-333333333333", content: "旧APIの返信", sentAt: "2026-10-09T02:00:00+00:00" },
      { replyIdentifier: "019a1234-5678-7000-8000-444444444444", content: "本人の追加説明", sentAt: null, replyType: "submitter", createdAt: "2026-10-09T03:00:00+00:00", principalIdentifier: null, name: null },
    ] };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(detail, { headers: { "Set-Cookie": "session=renewed; HttpOnly" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest(`http://localhost/api/site-management/contacts/${identifier}`, { headers: { Cookie: "session=test", "Accept-Language": "ja" } }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(detail);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Set-Cookie")).toBe("session=renewed; HttpOnly");
    expect(fetchMock).toHaveBeenCalledWith(`http://backend.test/api/v1/site-management/contacts/${identifier}`, expect.objectContaining({ method: "GET", cache: "no-store", headers: expect.objectContaining({ Cookie: "session=test", "Accept-Language": "ja" }) }));
  });

  it("ignores a legacy principal query and keeps the identifier-only endpoint", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ contactIdentifier: identifier, principalIdentifier: identifier, category: 1, name: "Sender", createdAt: "2026-10-08T00:00:00+00:00", content: "Inquiry", replies: [] }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(new NextRequest(`http://localhost/api/site-management/contacts/${identifier}?principalIdentifier=${identifier}`), context)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(`http://backend.test/api/v1/site-management/contacts/${identifier}`, expect.anything());
  });
});
