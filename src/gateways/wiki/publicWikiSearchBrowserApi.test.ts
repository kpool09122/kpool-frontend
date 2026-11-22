import { afterEach, describe, expect, it, vi } from "vitest";
import { searchPublicWikis } from "./publicWikiSearchBrowserApi";

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.unstubAllGlobals());

describe("searchPublicWikis", () => {
  it("sends language, encoded keyword, bounded page size and abort signal", async () => {
    const item = { wikiIdentifier: "1", name: "TWICE", slug: "gr-twice", language: "ja" };
    const fetchMock = vi.fn().mockResolvedValue(respond({ status: "success", data: { wikis: [item] } }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;
    await expect(searchPublicWikis("ja", " TWICE & 日本語 ", signal)).resolves.toEqual([item]);
    const params = new URL(fetchMock.mock.calls[0][0], "https://example.com").searchParams;
    expect(params.get("keyword")).toBe("TWICE & 日本語");
    expect(params.get("language")).toBe("ja");
    expect(params.get("perPage")).toBe("10");
    expect(fetchMock.mock.calls[0][1].signal).toBe(signal);
  });

  it("accepts an empty search result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond({ status: "empty" })));
    await expect(searchPublicWikis("en", "missing", new AbortController().signal)).resolves.toEqual([]);
  });

  it.each([
    [{ status: "error", message: "private backend details" }, 200],
    [{ status: "success", data: { wikis: [{ name: "missing slug" }] } }, 200],
    [{}, 503],
  ])("rejects errors and malformed responses", async (body, status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(body, status)));
    await expect(searchPublicWikis("ja", "twice", new AbortController().signal)).rejects.toThrow();
  });
});
