import { createHash, createHmac } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./drafts/[wikiId]/submit/route";
import { POST as approve } from "./drafts/[wikiId]/approve/route";
import { POST as reject } from "./drafts/[wikiId]/reject/route";
import { POST as publish } from "./drafts/[wikiId]/publish/route";
import { POST as withdraw } from "./drafts/[wikiId]/withdraw/route";
import { POST as translate } from "./drafts/[wikiId]/translate/route";
import { getWikiVisitorLocationSigner } from "./visitorLocation";

const context = vi.hoisted(() => vi.fn());
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: context }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetAllMocks(); });
const secret = "fixture-secret-at-least-32-characters";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
it("signs Cloudflare location against the exact backend URI, body and cookie, ignoring browser geo", async () => {
  context.mockReturnValue({ cf: { country: "JP", regionCode: "01" }, env: { WIKI_VISITOR_LOCATION_SECRET: secret } });
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  const fetchMock = vi.fn().mockResolvedValue(new Response('{"message":"Unauthenticated"}', { status: 401 }));
  vi.stubGlobal("fetch", fetchMock);
  await POST(new NextRequest("https://frontend.example/api/wiki/drafts/id/submit", {
    method: "POST", headers: { cookie: "session=alice", "content-type": "application/json", "x-kpool-visitor-country": "US", "x-kpool-visitor-region": "CA" },
    body: '{"resourceType":"group","wikiId":"id"}',
  }), { params: Promise.resolve({ wikiId: "id" }) });
  const [url, init] = fetchMock.mock.calls[0];
  const headers = new Headers(init.headers);
  expect(headers.get("x-kpool-visitor-country")).toBe("JP");
  expect(headers.get("x-kpool-visitor-region")).toBe("01");
  const uri = new URL(url);
  const payload = ["kpool-visitor-v1", headers.get("x-kpool-visitor-timestamp"), "POST", uri.pathname + uri.search, hash(init.body), hash(""), hash("session=alice"), "JP", "01"].join("\n");
  expect(headers.get("x-kpool-visitor-signature")).toBe(createHmac("sha256", secret).update(payload).digest("hex"));
});

const scenarios = [
  { label: "leading zero", cf: { country: "JP", regionCode: "01" }, country: "JP", region: "01" },
  { label: "alphabetic region", cf: { country: "US", regionCode: "CA" }, country: "US", region: "CA" },
  { label: "unknown enum", cf: { country: "ZZ", regionCode: "NEW9" }, country: "ZZ", region: "NEW9" },
  { label: "country only", cf: { country: "JP" }, country: "JP", region: null },
  { label: "missing", cf: undefined, country: null, region: null },
  { label: "unknown country", cf: { country: "XX", regionCode: "01" }, country: null, region: null },
  { label: "Tor", cf: { country: "T1" }, country: null, region: null },
  { label: "region without country", cf: { regionCode: "01" }, country: null, region: null },
  { label: "invalid region", cf: { country: "JP", regionCode: "JP-01" }, country: "JP", region: null },
  { label: "unavailable context", cf: undefined, unavailable: true, country: null, region: null },
];
for (const [action, handler] of [["submit", POST], ["approve", approve], ["reject", reject], ["publish", publish], ["withdraw", withdraw]] as const) {
  it.each(scenarios)(`${action}: $label succeeds preserving existing auth/CSRF and ignoring spoofed geo`, async (scenario) => {
    if (scenario.unavailable) context.mockImplementation(() => { throw new Error("No Worker context"); });
    else context.mockReturnValue({ cf: scenario.cf, env: { WIKI_VISITOR_LOCATION_SECRET: secret } });
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    const fetchMock = vi.fn().mockResolvedValue(Response.json(action === "publish" ? {
      wikiIdentifier: "published-id", language: "ja", name: "Fixture", resourceType: "group", version: 2,
    } : { wikiIdentifier: "draft-id", language: "ja", name: "Fixture", resourceType: "group", status: "pending" }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await handler(new NextRequest(`https://frontend.example/api/wiki/drafts/id/${action}`, {
      method: "POST", headers: { cookie: "session=alice", "accept-language": "ja", "x-xsrf-token": "csrf-fixture",
        "x-kpool-wiki-review-request": "1", "content-type": "application/json",
        "x-kpool-country": "US", "cf-ipcountry": "US", "x-kpool-visitor-country": "US",
        "x-kpool-visitor-region": "CA", "x-kpool-visitor-timestamp": "1234567890", "x-kpool-visitor-signature": "forged" },
      body: JSON.stringify({ resourceType: "group", wikiId: "id", rejectionReason: "fixture", country: "US", region: "CA" }),
    }), { params: Promise.resolve({ wikiId: "id" }) });
    expect(response.status).toBe(201);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://backend.example/api/v1/wiki/wiki/id/${action}`);
    const headers = new Headers(init.headers);
    expect(headers.get("cookie")).toBe("session=alice");
    expect(headers.get("accept-language")).toBe("ja");
    expect(headers.get("x-xsrf-token")).toBe("csrf-fixture");
    expect(init.cache).toBe("no-store");
    expect(headers.get("x-kpool-visitor-country")).toBe(scenario.country);
    expect(headers.get("x-kpool-visitor-region")).toBe(scenario.region);
    if (scenario.country) {
      const uri = new URL(url);
      const payload = ["kpool-visitor-v1", headers.get("x-kpool-visitor-timestamp"), "POST", uri.pathname + uri.search,
        hash(init.body ?? ""), hash(""), hash("session=alice"), scenario.country, scenario.region ?? ""].join("\n");
      expect(headers.get("x-kpool-visitor-signature")).toBe(createHmac("sha256", secret).update(payload).digest("hex"));
    } else {
      expect(headers.has("x-kpool-visitor-timestamp")).toBe(false);
      expect(headers.has("x-kpool-visitor-signature")).toBe(false);
    }
  });
}
it.each([undefined, "short"])("omits location with unavailable signing secret %s", (value) => {
  context.mockReturnValue({ cf: { country: "JP", regionCode: "01" }, env: { WIKI_VISITOR_LOCATION_SECRET: value } });
  expect(getWikiVisitorLocationSigner()).toBeUndefined();
});
it("does not reuse another request's location", async () => {
  context.mockReturnValue({ cf: { country: "JP", regionCode: "01" }, env: { WIKI_VISITOR_LOCATION_SECRET: secret } });
  const first = getWikiVisitorLocationSigner();
  context.mockReturnValue({ cf: { country: "US", regionCode: "CA" }, env: { WIKI_VISITOR_LOCATION_SECRET: secret } });
  const second = getWikiVisitorLocationSigner();
  expect((await first?.("https://backend.example/action", "", {}))?.["X-Kpool-Visitor-Region"]).toBe("01");
  expect((await second?.("https://backend.example/action", "", {}))?.["X-Kpool-Visitor-Region"]).toBe("CA");
});
it("omits location on a signing failure", async () => {
  context.mockReturnValue({ cf: { country: "JP" }, env: { WIKI_VISITOR_LOCATION_SECRET: secret } });
  vi.stubGlobal("crypto", { subtle: { digest: vi.fn().mockRejectedValue(new Error("unavailable")) } });
  expect(await getWikiVisitorLocationSigner()?.("https://backend.example/action", "", {})).toEqual({});
});

it("does not attach history location to translation", async () => {
  context.mockReturnValue({ cf: { country: "JP", regionCode: "01" }, env: { WIKI_VISITOR_LOCATION_SECRET: secret } });
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ draftWikis: [] }));
  vi.stubGlobal("fetch", fetchMock);
  const response = await translate(new NextRequest("https://frontend.example/api/wiki/drafts/id/translate", {
    method: "POST", headers: { "x-kpool-wiki-review-request": "1", "content-type": "application/json" },
    body: JSON.stringify({ resourceType: "group", language: "ja" }),
  }), { params: Promise.resolve({ wikiId: "id" }) });
  expect(response.status).toBe(201);
  const headers = new Headers(fetchMock.mock.calls[0][1].headers);
  expect([...headers.keys()].some((key) => key.startsWith("x-kpool-visitor-"))).toBe(false);
});
