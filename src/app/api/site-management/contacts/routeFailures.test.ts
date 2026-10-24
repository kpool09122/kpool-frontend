import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";

import { GET as list } from "./route";
import { GET as detail } from "./[contactIdentifier]/route";
import { POST as reply } from "./[contactIdentifier]/replies/route";

const identifier = "019a1234-5678-7000-8000-111111111111";
const context = { params: Promise.resolve({ contactIdentifier: identifier }) };
const cases = [
  { name: "list", method: "GET", path: "/api/site-management/contacts", handler: list },
  { name: "detail", method: "GET", path: `/api/site-management/contacts/${identifier}`, handler: detail },
  { name: "reply", method: "POST", path: `/api/site-management/contacts/${identifier}/replies`, handler: reply },
];

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe.each(cases)("contacts $name BFF failures", ({ method, path, handler }) => {
  const request = () => new NextRequest(`http://localhost${path}`, {
    method,
    headers: { Cookie: "session=test", "Accept-Language": "ja", "X-XSRF-TOKEN": "csrf" },
    ...(method === "POST" ? { body: JSON.stringify({ content: "Reply" }) } : {}),
  });

  it.each([401, 403, 404, 419, 422, 429, 500])("preserves Problem Details, status %s and session cookies without caching", async (status) => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const problem = { type: "https://example.test/problems/contact", title: "Request rejected", status, detail: "お問い合わせを処理できません。", code: "contact_rejected" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(problem, {
      status,
      headers: { "Set-Cookie": "session=renewed; HttpOnly" },
    })));
    const response = await handler(request(), context);
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Set-Cookie")).toBe("session=renewed; HttpOnly");
    expect(await response.json()).toEqual({ ...problem, message: problem.detail });
  });

  it("preserves principal_inactive for the browser's shared access monitor", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    const problem = { type: "https://example.test/problems/principal-inactive", title: "Forbidden", status: 403, detail: "利用権限が停止されています。", code: "principal_inactive" };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(problem, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await handler(request(), context);
    fetchMock.mockResolvedValue(response);
    const events: Event[] = [];
    const onInactive = (event: Event) => { events.push(event); };
    window.addEventListener("kpool:principal-inactive", onInactive);
    try {
      await browserApiFetch(path);
      expect(events).toHaveLength(1);
      expect((events[0] as CustomEvent).detail).toEqual({ path });
    } finally {
      window.removeEventListener("kpool:principal-inactive", onInactive);
    }
  });

  it("keeps malformed upstream error bodies safe while preserving status and cookies", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private invalid JSON", { status: 403, headers: { "Set-Cookie": "session=renewed; HttpOnly" } })));
    const response = await handler(request(), context);
    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Set-Cookie")).toBe("session=renewed; HttpOnly");
    expect(await response.json()).toEqual({ message: "Contact API request failed with status 403." });
  });

  it("does not cache an unavailable backend configuration", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await handler(request(), context);
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps network failure to an uncached 502", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private connection error")));
    const response = await handler(request(), context);
    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(await response.json())).not.toContain("private connection error");
  });
});

describe.each(cases.filter(({ method }) => method === "GET"))("contacts $name invalid upstream response", ({ path, handler }) => {
  it("retains renewed cookies even when response validation fails", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { headers: { "Set-Cookie": "session=renewed; HttpOnly" } })));
    const response = await handler(new NextRequest(`http://localhost${path}`), context);
    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Set-Cookie")).toBe("session=renewed; HttpOnly");
  });
});
