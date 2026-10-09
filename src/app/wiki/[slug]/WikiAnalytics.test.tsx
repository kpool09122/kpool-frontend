import { StrictMode } from "react";
import Link from "next/link";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMockWikiDetail } from "@kpool/wiki";
import { AnalyticsProvider } from "@/components/Analytics/AnalyticsProvider";
import { PublicWikiAnalytics } from "@/components/Analytics/PublicWikiAnalytics";
import { WikiDetailPage } from "@/app/wiki/[slug]/WikiDetailPage";
import { WikiDetailContent } from "@/components/Wiki/WikiDetailContent";
import { I18nProvider } from "@/i18n/I18nProvider";

const navigation = vi.hoisted(() => ({ pathname: "/ja/wiki/gr-example" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
vi.mock("next/script", () => ({ default: () => null }));
const wiki = { ...createMockWikiDetail("gr-example"), language: "ja" };
const events = () => (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer ?? [];

afterEach(() => { cleanup(); delete (window as Window & { dataLayer?: unknown[] }).dataLayer; });

describe("public Wiki measurement boundary", () => {
  it("counts one successful view in StrictMode and measures keyboard/modified/middle clicks without changing navigation", () => {
    window.history.replaceState({}, "", navigation.pathname);
    const prevented: boolean[] = [];
    const ui = <StrictMode><AnalyticsProvider containerId="GTM-TEST">
      <PublicWikiAnalytics wiki={wiki}>
        <Link href="/ja/wiki/tl-member" data-wiki-link-placement="related_profile" data-wiki-id="member" onClick={(e) => { prevented.push(e.defaultPrevented); e.preventDefault(); }} onAuxClick={(e) => { prevented.push(e.defaultPrevented); e.preventDefault(); }}><span>Member</span></Link>
      </PublicWikiAnalytics>
    </AnalyticsProvider></StrictMode>;
    const { rerender } = render(ui);
    rerender(ui);
    expect(events().filter((event) => event.event === "wiki_page_view")).toHaveLength(1);
    fireEvent.click(screen.getByText("Member"), { detail: 0 });
    fireEvent.click(screen.getByText("Member"), { ctrlKey: true });
    fireEvent(screen.getByText("Member"), new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true }));
    fireEvent(screen.getByText("Member"), new MouseEvent("auxclick", { button: 2, bubbles: true, cancelable: true }));
    expect(events().filter((event) => event.event === "wiki_link_click")).toHaveLength(3);
    expect(prevented).toEqual([false, false, false, false]);
  });

  it("does not measure when disabled", () => {
    render(<AnalyticsProvider containerId={null}><PublicWikiAnalytics wiki={wiki}><span>Wiki</span></PublicWikiAnalytics></AnalyticsProvider>);
    expect(events()).toEqual([]);
  });

  it("shared preview content and failed public states do not generate views", () => {
    render(<AnalyticsProvider containerId="GTM-TEST"><I18nProvider initialLocale="ja">
      <WikiDetailContent data={wiki} language="ja" />
      <WikiDetailPage language="ja" slug={wiki.slug} wikiState={{ status: "empty" }} />
      <WikiDetailPage language="ja" slug={wiki.slug} wikiState={{ status: "loading" }} />
      <WikiDetailPage language="ja" slug={wiki.slug} wikiState={{ status: "error", message: "failure" }} />
    </I18nProvider></AnalyticsProvider>);
    expect(events()).toEqual([]);
  });
});
