import { afterEach, expect, it, vi } from "vitest";
import { loadWikiStatistics } from "./wikiStatistics";

const statistics = {
  total: 12,
  languages: { ja: 5, en: 3, ko: 4 },
  resourceTypes: { agency: 1, group: 6, talent: 3, song: 2 },
  groupTypes: { boy_group: 3, girl_group: 2, co_ed: 1, unknown: 0 },
};
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("loads validated public counts with a shared invalidation tag", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example/api/v1/wiki");
  const fetchMock = vi.fn().mockResolvedValue(Response.json(statistics));
  vi.stubGlobal("fetch", fetchMock);
  expect(await loadWikiStatistics()).toEqual(statistics);
  expect(fetchMock).toHaveBeenCalledWith("https://backend.example/api/v1/wiki/wikis/statistics", expect.objectContaining({
    next: { revalidate: 300, tags: ["wiki-public-content"] },
  }));
});
it.each([
  { ...statistics, total: 13 },
  { ...statistics, groupTypes: { ...statistics.groupTypes, unknown: 1 } },
  { ...statistics, languages: { ja: -1, en: 9, ko: 4 } },
  {},
])("does not render inconsistent or malformed counts", async (body) => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
  expect(await loadWikiStatistics()).toBeNull();
});
it("keeps unavailable counts separate from a real zero", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
  expect(await loadWikiStatistics()).toBeNull();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
  expect(await loadWikiStatistics()).toBeNull();
});
