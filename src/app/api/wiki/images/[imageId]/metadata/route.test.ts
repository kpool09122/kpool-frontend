import { revalidateTag } from "next/cache";
import { publicWikiCacheTag } from "@/gateways/wiki/publicWikiCache";
import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";
import { wikiDraftImageReviewCsrfHeaderName, wikiDraftImageReviewCsrfHeaderValue } from "@kpool/wiki";
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
const imageId = "11111111-1111-4111-8111-111111111111";
const metadata = { sourceName: "Source", author: "Author", license: "CC-BY-4.0", altText: "", displayOrder: 0 };
const request = (body: unknown, csrf = true) => new NextRequest(`https://app.example.test/api/wiki/images/${imageId}/metadata`, {
  method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "session=abc", ...(csrf ? { [wikiDraftImageReviewCsrfHeaderName]: wikiDraftImageReviewCsrfHeaderValue } : {}) }, body: JSON.stringify(body),
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("requires the mutation request header before contacting the backend", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  expect((await PATCH(request(metadata, false), { params: Promise.resolve({ imageId }) })).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
  expect(revalidateTag).not.toHaveBeenCalled();
});
it("forwards metadata only and accepts an empty alternative text", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
  const fetch = vi.fn().mockResolvedValue(Response.json({ imageIdentifier: imageId, resourceType: "talent", isHidden: true }));
  vi.stubGlobal("fetch", fetch);
  const response = await PATCH(request({ ...metadata, sourceUrl: "https://changed.test", base64EncodedImage: "changed" }), { params: Promise.resolve({ imageId }) });
  expect(response.status).toBe(200);
  expect(revalidateTag).toHaveBeenCalledWith(publicWikiCacheTag, { expire: 0 });
  expect(fetch).toHaveBeenCalledWith(`https://api.example.test/api/v1/wiki/image/${imageId}/metadata`, expect.objectContaining({ method: "PATCH", body: JSON.stringify(metadata) }));
  expect(fetch.mock.calls[0][1].headers.Cookie).toBe("session=abc");
  expect(await response.json()).toEqual({ imageIdentifier: imageId, resourceType: "talent", isHidden: true });
});
it("rejects invalid metadata without invoking the backend", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const response = await PATCH(request({ ...metadata, license: null }), { params: Promise.resolve({ imageId }) });
  expect(response.status).toBe(422);
  expect(fetch).not.toHaveBeenCalled();
  expect(revalidateTag).not.toHaveBeenCalled();
});

it("does not invalidate public data when the backend rejects the update", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "Forbidden" }, { status: 403 })));
  const response = await PATCH(request(metadata), { params: Promise.resolve({ imageId }) });
  expect(response.status).toBe(403);
  expect(revalidateTag).not.toHaveBeenCalled();
});

it.each([{ sourceName: "x".repeat(256) }, { altText: "x".repeat(513) }, { displayOrder: 2147483648 }])("rejects metadata beyond storage bounds: %j", async (invalid) => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.example.test");
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const response = await PATCH(request({ ...metadata, ...invalid }), { params: Promise.resolve({ imageId }) });
  expect(response.status).toBe(422);
  expect(fetch).not.toHaveBeenCalled();
  expect(revalidateTag).not.toHaveBeenCalled();
});
