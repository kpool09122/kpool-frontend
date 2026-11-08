import { describe, expect, it, vi } from "vitest";
import { createWikiAnalytics, type AnalyticsEvent } from "./wikiAnalytics";

const wiki = {
  wikiIdentifier: "wiki-ja", translationSetIdentifier: "translation-set",
  resourceType: "group" as const, language: "ja" as const, slug: "gr-example", title: "Example",
};
const setup = () => {
  const browser = { location: "https://k-pool.app/ja", referrer: "https://search.test/?token=secret" };
  const calls: AnalyticsEvent[] = [];
  const send = vi.fn((event: AnalyticsEvent) => calls.push(event));
  const context = vi.fn((event: AnalyticsEvent) => calls.push(event));
  const tracker = createWikiAnalytics(() => browser, send, context);
  return { browser, send, context, tracker, calls };
};

describe("App analytics", () => {
  it.each(["/login", "/mypage", "/wiki/gr-example/edit", "/admin", "/preview", "/not-found"])("measures %s once without sensitive URL values or Wiki attributes", (path) => {
    const { browser, tracker, send } = setup();
    browser.location = `https://k-pool.app${path}?token=secret&email=person@example.test#private`;
    tracker.observeNavigation(path);
    tracker.observeNavigation(path);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({
      event: "app_page_view", page_location: `https://k-pool.app${path}`,
      page_referrer: "https://search.test/", page_title: "k-pool", wiki_id: null,
      wiki_translation_set_id: null, wiki_language: null, wiki_type: null,
    }));
    expect(JSON.stringify(send.mock.calls)).not.toContain("secret");
  });

  it.each(["/ja/wiki/gr-example", "/wiki/ja/gr-example", "/en/wiki/gr-example", "/wiki/ko/gr-example"])("waits for successful Wiki data on %s without an extra App view", (path) => {
    const { browser, tracker, send } = setup();
    const language = path.includes("/en/") ? "en" : path.includes("/ko/") ? "ko" : "ja";
    browser.location = `https://k-pool.app${path}`;
    tracker.observeNavigation(path);
    tracker.pageView(path, { ...wiki, language });
    tracker.pageView(path, { ...wiki, language });
    expect(send.mock.calls.filter(([event]) => event.event === "wiki_page_view")).toHaveLength(1);
    expect(send.mock.calls.at(-1)?.[0].event).toBe("wiki_page_view");
  });

  it.each(["/en/wiki/gr-example", "/wiki/ko/gr-example", "/wiki/gr-example/edit", "/mypage"])("flushes old Wiki time before switching context to %s", (path) => {
    const { browser, tracker, calls, context } = setup();
    browser.location = "https://k-pool.app/ja/wiki/gr-example";
    tracker.pageView("/ja/wiki/gr-example", wiki);
    calls.length = 0;
    browser.location = `https://k-pool.app${path}`;
    tracker.observeNavigation(path);
    expect(calls[0]).toMatchObject({ event: "analytics_page_end", wiki_id: "wiki-ja", wiki_language: "ja", page_location: "https://k-pool.app/ja/wiki/gr-example" });
    expect(calls[1]).toMatchObject({ event: "analytics_context", wiki_id: null, page_location: `https://k-pool.app${path}` });
    if (path.includes("/en/") || path.includes("/ko/")) {
      tracker.pageView(path, { ...wiki, wikiIdentifier: "next-wiki", language: path.includes("/en/") ? "en" : "ko" });
      expect(context).toHaveBeenLastCalledWith(expect.objectContaining({ wiki_id: "next-wiki" }));
    }
    // GA4 owns its engagement clock; do not double-count it with an app timer.
    expect(calls.every((event) => !("engagement_time_msec" in event))).toBe(true);
  });

  it("flushes background/exit once, resumes without a new page_view, and preserves the original page URL", () => {
    const { browser, tracker, send } = setup();
    browser.location = "https://k-pool.app/ja/wiki/gr-example";
    tracker.pageView("/ja/wiki/gr-example", wiki);
    browser.location = "https://k-pool.app/mypage";
    send.mockClear();
    tracker.suspend();
    tracker.suspend();
    expect(send.mock.calls.filter(([event]) => event.event === "analytics_page_end")).toHaveLength(1);
    expect(send.mock.calls.at(-1)?.[0]).toMatchObject({ wiki_id: "wiki-ja", page_location: "https://k-pool.app/ja/wiki/gr-example" });
    tracker.resume();
    tracker.suspend();
    expect(send.mock.calls.filter(([event]) => event.event === "analytics_page_end")).toHaveLength(2);
    expect(send.mock.calls.filter(([event]) => event.event === "wiki_page_view")).toHaveLength(0);
  });
});
