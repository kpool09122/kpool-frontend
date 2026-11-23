import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { WikiBlockDisplay } from "../WikiBlockDisplay";
import type { WikiGoogleTrendsBlock } from "@kpool/wiki";

// Settings are independent of the external chart script.
vi.mock("next/script", () => ({ default: () => null }));

const block: WikiGoogleTrendsBlock = {
  blockKey: "trends-1",
  blockType: "google_trends",
  displayOrder: 10,
};
const view = (searchTerm = "TWICE & 트와이스", language = "ja") => (
  <I18nProvider initialLocale="en">
    <WikiBlockDisplay block={block} language={language} googleTrendsSearchTerm={searchTerm} />
  </I18nProvider>
);
afterEach(() => {
  cleanup();
});

describe("Google Trends display", () => {
  it("updates the same-condition link with temporary viewer settings", () => {
    const { unmount } = render(view());
    expect(screen.getByText("Source: Google Trends.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Region"), {
      target: { value: "all" },
    });
    fireEvent.change(screen.getByLabelText("Time range"), {
      target: { value: "today 5-y" },
    });
    const link = screen.getByRole("link", { name: /Open Google Trends/ });
    const href = new URL(link.getAttribute("href")!);
    expect(href.searchParams.get("q")).toBe("TWICE & 트와이스");
    expect(href.searchParams.get("geo")).toBe("");
    expect(href.searchParams.get("date")).toBe("today 5-y");
    expect(screen.getByLabelText("Region")).toHaveValue("all");
    expect(screen.getByLabelText("Time range")).toHaveValue("today 5-y");
    unmount();
    render(view());
    expect(screen.getByLabelText("Region")).toHaveValue("JP");
    expect(screen.getByLabelText("Time range")).toHaveValue("today 10-y");
  });

  it("supports English Wiki regions and resets when authoritative settings change", () => {
    const { rerender } = render(view("TWICE", "en"));
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
    rerender(view("New name", "en"));
    expect(screen.getByLabelText("Region")).toHaveValue("all");
  });
});
