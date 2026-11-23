import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { WikiBlockDisplay } from "../WikiBlockDisplay";
import type { WikiGoogleTrendsBlock } from "@kpool/wiki";

const block: WikiGoogleTrendsBlock = {
  blockKey: "trends-1",
  blockType: "google_trends",
  displayOrder: 10,
  searchTerm: "TWICE & 트와이스",
  region: "JP",
  timeRange: "today 12-m",
};
const view = (value = block, language = "ja") => (
  <I18nProvider initialLocale="en">
    <WikiBlockDisplay block={value} language={language} />
  </I18nProvider>
);
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Google Trends display", () => {
  it("renders the official widget, source and same-condition link, with temporary viewer settings", () => {
    const { unmount } = render(view());
    const frame = screen.getByTitle(
      `Google Trends: ${block.searchTerm}`,
    ) as HTMLIFrameElement;
    const url = new URL(frame.src);
    expect(url.origin + url.pathname).toBe(
      "https://trends.google.com/trends/embed/explore/TIMESERIES",
    );
    expect(JSON.parse(url.searchParams.get("req")!)).toEqual({
      comparisonItem: [
        { keyword: block.searchTerm, geo: "JP", time: "today 12-m" },
      ],
      category: 0,
      property: "",
    });
    expect(screen.getByText("Source: Google Trends.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Region"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Time range"), {
      target: { value: "today 5-y" },
    });
    const link = screen.getByRole("link", { name: /Open Google Trends/ });
    const href = new URL(link.getAttribute("href")!);
    expect(href.searchParams.get("q")).toBe(block.searchTerm);
    expect(href.searchParams.get("geo")).toBe("");
    expect(href.searchParams.get("date")).toBe("today 5-y");
    expect(block.region).toBe("JP");
    unmount();
    render(view());
    expect(screen.getByLabelText("Region")).toHaveValue("JP");
  });

  it("keeps fallback links, offers retry after timeout and cleans up on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(view());
    act(() => vi.advanceTimersByTime(15000));
    expect(screen.getByText("If the chart is unavailable or there is insufficient data, open Google Trends.")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "loading could not be confirmed",
    );
    const old = screen.getByTitle(`Google Trends: ${block.searchTerm}`);
    fireEvent.click(screen.getByRole("button", { name: "Reload chart" }));
    expect(screen.getByTitle(`Google Trends: ${block.searchTerm}`)).not.toBe(
      old,
    );
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("accepts ready/height messages only from the current official frame and removes listeners", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(view());
    const frame = screen.getByTitle(
      `Google Trends: ${block.searchTerm}`,
    ) as HTMLIFrameElement;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    fireEvent.load(frame);
    const [data, origin] = post.mock.calls[0];
    expect(origin).toBe("https://trends.google.com");
    const ready = { ...data, isReady: true, height: 999999 };
    const message = (origin: string, source: Window | null, data: unknown) =>
      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", { origin, source, data }),
        );
      });
    message("https://evil.example", frame.contentWindow, ready);
    message("https://trends.google.com", window, ready);
    message("https://trends.google.com", frame.contentWindow, {
      ...ready,
      uniqueID: "stale",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(frame.style.height).toBe("420px");
    message("https://trends.google.com", frame.contentWindow, ready);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(frame.style.height).toBe("800px");
    unmount();
    expect(remove).toHaveBeenCalledWith("message", expect.any(Function));
    vi.restoreAllMocks();
  });

  it("supports English Wiki regions and resets when authoritative settings change", () => {
    const { rerender } = render(view({ ...block, region: "" }, "en"));
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "Worldwide",
      "Japan",
      "South Korea",
      "Past 3 months",
      "Past 6 months",
      "Past year",
      "Past 2 years",
      "Past 5 years",
      "Past 10 years",
    ]);
    fireEvent.change(screen.getByLabelText("Region"), {
      target: { value: "KR" },
    });
    rerender(view({ ...block, region: "", searchTerm: "New name" }, "en"));
    expect(screen.getByLabelText("Region")).toHaveValue("");
  });
});
