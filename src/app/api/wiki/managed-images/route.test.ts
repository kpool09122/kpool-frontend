import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("always forwards approved status and pagination with authentication", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
  const fetch = vi.fn().mockResolvedValue(Response.json({ images: [], current_page: 2, last_page: 2, per_page: 12, total: 12 }));
  vi.stubGlobal("fetch", fetch);
  const result = await GET(new NextRequest("https://app.example.test/api/wiki/managed-images?status=pending&page=2", { headers: { Cookie: "session=abc" } }));
  expect(result.status).toBe(200);
  expect(String(fetch.mock.calls[0][0])).toBe("https://api.example.test/api/v1/wiki/managed-images?status=approved&page=2&perPage=12");
  expect(fetch.mock.calls[0][1].headers.Cookie).toBe("session=abc");
});

it("forwards combined license and missing-author filters", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
  const fetch = vi.fn().mockResolvedValue(Response.json({ images: [], current_page: 1, last_page: 1, per_page: 12, total: 0 }));
  vi.stubGlobal("fetch", fetch);
  const result = await GET(new NextRequest("https://app.example.test/api/wiki/managed-images?license=CC-BY-4.0&authorMissing=true"));
  expect(result.status).toBe(200);
  const url = new URL(String(fetch.mock.calls[0][0]));
  expect(url.searchParams.get("license")).toBe("CC-BY-4.0");
  expect(url.searchParams.get("authorMissing")).toBe("true");
  expect(url.searchParams.get("status")).toBe("approved");
});
it.each(["license=unknown", "authorMissing=maybe", "licenseMissing=maybe"])("rejects an invalid filter before forwarding: %s", async (query) => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const result = await GET(new NextRequest(`https://app.example.test/api/wiki/managed-images?${query}`));
  expect(result.status).toBe(422);
  expect(fetch).not.toHaveBeenCalled();
});

it("forwards the unselected license filter together with missing author", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
  const fetch = vi.fn().mockResolvedValue(Response.json({ images: [], current_page: 1, last_page: 1, per_page: 12, total: 0 }));
  vi.stubGlobal("fetch", fetch);
  const result = await GET(new NextRequest("https://app.example.test/api/wiki/managed-images?licenseMissing=true&authorMissing=true"));
  expect(result.status).toBe(200);
  const url = new URL(String(fetch.mock.calls[0][0]));
  expect(url.searchParams.get("licenseMissing")).toBe("true");
  expect(url.searchParams.get("authorMissing")).toBe("true");
  expect(url.searchParams.has("license")).toBe(false);
});
