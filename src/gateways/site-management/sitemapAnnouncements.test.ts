import { beforeEach, expect, it, vi } from "vitest";
import { loadPublicAnnouncements } from "./publicAnnouncements";
import { loadSitemapAnnouncements } from "./sitemapAnnouncements";

vi.mock("./publicAnnouncements", () => ({ loadPublicAnnouncements: vi.fn() }));
const identifier = "019b0000-0000-7000-8000-000000000001";
const list = (page: number, lastPage = page) => ({
  announcements: [{
    announcement_id: identifier,
    category_name: "NEWS" as const,
    title: "News",
    content: "Content",
    published_date: "2026-10-01T00:00:00Z",
  }],
  current_page: page,
  last_page: lastPage,
  total: lastPage,
  per_page: 1,
});

beforeEach(() => vi.resetAllMocks());

it("enumerates every page in each language using only the public list", async () => {
  vi.mocked(loadPublicAnnouncements).mockImplementation(async (_language, page) => ({
    ok: true,
    list: list(page, 2),
  }));
  const result = await loadSitemapAnnouncements();
  expect(result).toEqual({
    status: "success",
    announcements: ["ja", "en", "ko"].flatMap((language) => [
      { language, identifier }, { language, identifier },
    ]),
  });
  expect(vi.mocked(loadPublicAnnouncements).mock.calls).toEqual([
    ["ja", 1], ["ja", 2], ["en", 1], ["en", 2], ["ko", 1], ["ko", 2],
  ]);
});

it("accepts an empty public list for every language", async () => {
  vi.mocked(loadPublicAnnouncements).mockResolvedValue({
    ok: true, list: { ...list(1), announcements: [], total: 0 },
  });
  expect(await loadSitemapAnnouncements()).toEqual({ status: "success", announcements: [] });
});

it.each(["failure", "repeated page", "invalid last page"])(
  "rejects partial results on %s",
  async (scenario) => {
    vi.mocked(loadPublicAnnouncements)
      .mockResolvedValueOnce({ ok: true, list: list(1, 2) })
      .mockResolvedValueOnce(scenario === "failure"
        ? { ok: false, status: 500 }
        : { ok: true, list: scenario === "repeated page" ? list(1, 2) : list(2, 1) });
    expect(await loadSitemapAnnouncements()).toEqual({ status: "error" });
    expect(loadPublicAnnouncements).toHaveBeenCalledTimes(2);
  },
);
