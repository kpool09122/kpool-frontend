import { afterEach, expect, it, vi } from "vitest";
import { loadWikiStatistics } from "./wikiStatistics";

const statistics = {
  total: 12,
  languages: { ja: 5, en: 3, ko: 4 },
  byLanguage: {
    ja: { resourceTypes: { agency: 0, group: 2, talent: 2, song: 1 }, groupTypes: { boy_group: 1, girl_group: 1, co_ed: 0, unknown: 0 } },
    en: { resourceTypes: { agency: 1, group: 0, talent: 1, song: 1 }, groupTypes: { boy_group: 0, girl_group: 0, co_ed: 0, unknown: 0 } },
    ko: { resourceTypes: { agency: 0, group: 4, talent: 0, song: 0 }, groupTypes: { boy_group: 2, girl_group: 1, co_ed: 1, unknown: 0 } },
  },
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
  { ...statistics, languages: { ja: -1, en: 9, ko: 4 } },
  { ...statistics, byLanguage: { ...statistics.byLanguage, ja: statistics.byLanguage.ko } },
  { ...statistics, byLanguage: { ...statistics.byLanguage, ja: { ...statistics.byLanguage.ja, groupTypes: statistics.byLanguage.ko.groupTypes } } },
  { ...statistics, byLanguage: undefined },
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
