import { afterEach, expect, it, vi } from "vitest";
import { loadPublicAnnouncements } from "./publicAnnouncements";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("uses explicit language, descending published date and pagination without any credentials", async () => {
  vi.stubEnv(
    "KPOOL_SITE_MANAGEMENT_PUBLIC_API_BASE_URL",
    "https://backend.example",
  );
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        announcements: [],
        current_page: 2,
        last_page: 2,
        total: 21,
        per_page: 20,
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  expect((await loadPublicAnnouncements("ko", 2)).ok).toBe(true);
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toContain(
    "language=ko&page=2&perPage=20&sort=published_date&order=desc",
  );
  expect(init.headers.Cookie).toBeUndefined();
  expect(init.cache).toBe("no-store");
});
it.each([404, 500])("retains HTTP failure %i", async (status) => {
  vi.stubEnv(
    "KPOOL_SITE_MANAGEMENT_PUBLIC_API_BASE_URL",
    "https://backend.example",
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status })),
  );
  expect(
    await loadPublicAnnouncements(
      "en",
      1,
      "019b0000-0000-7000-8000-000000000001",
    ),
  ).toEqual({ ok: false, status });
});
it("rejects malformed JSON/schema and network failure", async () => {
  vi.stubEnv(
    "KPOOL_SITE_MANAGEMENT_PUBLIC_API_BASE_URL",
    "https://backend.example",
  );
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({}))
    .mockResolvedValueOnce(new Response("not json"))
    .mockRejectedValueOnce(new Error("secret"));
  vi.stubGlobal("fetch", fetcher);
  for (let index = 0; index < 3; index += 1)
    expect(await loadPublicAnnouncements("ja", 1)).toEqual({
      ok: false,
      status: 502,
    });
});
