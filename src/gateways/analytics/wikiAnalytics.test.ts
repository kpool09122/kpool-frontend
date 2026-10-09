import { describe, expect, it, vi, afterEach } from "vitest";
import { createWikiAnalytics, createBrowserWikiAnalytics, resolveGtmContainerId, type AnalyticsWiki } from "./wikiAnalytics";

const wiki: AnalyticsWiki = {
  wikiIdentifier: "wiki-ja", translationSetIdentifier: "group-translation-set",
  resourceType: "group", language: "ja", slug: "gr-example", title: "Example",
};
const path = "/ja/wiki/gr-example";
const setup = () => {
  const browser = { location: `https://kpool.test${path}?utm_source=newsletter`, referrer: "https://search.test/" };
  const send = vi.fn();
  return { browser, send, tracker: createWikiAnalytics(() => browser, send) };
};

describe("Wiki analytics", () => {
  it("requires explicit opt-in and a valid container id", () => {
    expect(resolveGtmContainerId("true", "GTM-T958HN6F")).toBe("GTM-T958HN6F");
    for (const enabled of [undefined, "false", "1"]) {
      expect(resolveGtmContainerId(enabled, "GTM-T958HN6F")).toBeNull();
    }
    for (const id of [undefined, "", "G-123", "GTM-';alert(1)//"]) {
      expect(resolveGtmContainerId("true", id)).toBeNull();
    }
  });

  it("records the successful Wiki identity and campaign URL once across repeated effects", () => {
    const { browser, send, tracker } = setup();
    tracker.pageView(path, wiki);
    tracker.observeNavigation(path);
    tracker.pageView(path, { ...wiki });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      event: "wiki_page_view", wiki_id: "wiki-ja", wiki_translation_set_id: "group-translation-set",
      wiki_type: "group", wiki_language: "ja", page_location: browser.location,
      page_referrer: "https://search.test/", page_title: "Example", target_wiki_id: null,
    }));
  });

  it("counts back/forward visits including a return from a non-Wiki route", () => {
    const { browser, send, tracker } = setup();
    tracker.pageView(path, wiki);
    browser.location = "https://kpool.test/ja";
    tracker.observeNavigation("/ja");
    browser.location = `https://kpool.test${path}`;
    tracker.pageView(path, wiki);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].page_referrer).toBe("https://kpool.test/ja");
    browser.location = "https://kpool.test/ja/wiki/tl-member";
    tracker.pageView("/ja/wiki/tl-member", { ...wiki, wikiIdentifier: "member-ja", slug: "tl-member", resourceType: "talent" });
    browser.location = `https://kpool.test${path}`;
    tracker.pageView(path, wiki);
    expect(send).toHaveBeenCalledTimes(4);
    expect(send.mock.calls[3][0].page_referrer).toBe("https://kpool.test/ja/wiki/tl-member");
  });

  it("keeps translations separate while retaining their shared identity", () => {
    const { browser, send, tracker } = setup();
    tracker.pageView(path, wiki);
    browser.location = "https://kpool.test/en/wiki/gr-example";
    tracker.pageView("/en/wiki/gr-example", { ...wiki, language: "en", wikiIdentifier: "wiki-en" });
    expect(send.mock.calls.map(([event]) => event.wiki_translation_set_id)).toEqual(["group-translation-set", "group-translation-set"]);
    expect(send.mock.calls.map(([event]) => event.wiki_id)).toEqual(["wiki-ja", "wiki-en"]);
  });

  it("ignores stale data during navigation, editing, and non-Wiki paths", () => {
    const { send, tracker } = setup();
    for (const pathname of ["/ja", `${path}/edit`, "/admin/wiki", "/ja/wiki/gr-other", "/en/wiki/gr-example"]) {
      tracker.pageView(pathname, wiki);
    }
    expect(send).not.toHaveBeenCalled();
    tracker.pageView(path, wiki);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("records a click separately from a view and clears unknown target identities", () => {
    const { send, tracker } = setup();
    tracker.pageView(path, wiki);
    tracker.linkClick(path, wiki, { href: "/ko/wiki/tl-member", placement: "related_profile", wikiIdentifier: "member-ko" });
    tracker.linkClick(path, wiki, { href: "/ja/wiki/unknown-slug#section", placement: "body" });
    expect(send.mock.calls[1][0]).toMatchObject({
      event: "wiki_link_click", wiki_id: "wiki-ja", target_wiki_id: "member-ko",
      target_wiki_type: "talent", target_wiki_language: "ko", link_placement: "related_profile",
      link_path: "/ko/wiki/tl-member",
    });
    expect(send.mock.calls[2][0]).toMatchObject({ target_wiki_id: null, target_wiki_type: null, link_path: "/ja/wiki/unknown-slug" });
    expect(send.mock.calls.filter(([event]) => event.event === "wiki_page_view")).toHaveLength(1);
  });

  it("ignores external links, edit links and malformed paths", () => {
    const { send, tracker } = setup();
    for (const href of ["https://external.test/ja/wiki/gr-example", `${path}/edit`, "/admin/wiki/foo", "/contact", "/ja/wiki/%E0%A4%A", "javascript:alert(1)"]) {
      tracker.linkClick(path, wiki, { href, placement: "body" });
    }
    expect(send).not.toHaveBeenCalled();
  });

  afterEach(() => { vi.restoreAllMocks(); delete (window as Window & { dataLayer?: unknown[] }).dataLayer; });
  it("queues events when the external script is blocked", () => {
    window.history.replaceState({}, "", path);
    createBrowserWikiAnalytics().pageView(path, wiki);
    expect((window as Window & { dataLayer?: unknown[] }).dataLayer).toEqual([expect.objectContaining({ event: "wiki_page_view" })]);
  });
  it("does not break the application if the dataLayer rejects writes", () => {
    window.history.replaceState({}, "", path);
    Object.defineProperty(window, "dataLayer", { configurable: true, get() { throw new Error("blocked"); } });
    expect(() => createBrowserWikiAnalytics().pageView(path, wiki)).not.toThrow();
  });
});
