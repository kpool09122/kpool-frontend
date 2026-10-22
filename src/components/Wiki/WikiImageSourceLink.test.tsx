import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { WikiImageSourceLink } from "./WikiImageSourceLink";

const image = {
  src: "https://cdn.example.com/profile.webp",
  alt: "Profile",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Profile.webp",
  sourceName: "Wikimedia Commons",
};

const show = (overrides = {}) => render(
  <I18nProvider initialLocale="en"><WikiImageSourceLink image={{ ...image, ...overrides }} /></I18nProvider>,
);

afterEach(cleanup);

describe("WikiImageSourceLink", () => {
  it("opens the original source page", () => {
    show();
    const link = screen.getByRole("link", { name: "Wikimedia Commons" });
    expect(link).toHaveAttribute("href", image.sourceUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("links to the source even when the site name is missing", () => {
    show({ sourceName: "" });
    expect(screen.getByRole("link", { name: "commons.wikimedia.org" })).toHaveAttribute("href", image.sourceUrl);
  });

  it.each([null, "", "invalid", "javascript:alert(1)"])("omits missing or unsafe source URL %s", (sourceUrl) => {
    show({ sourceUrl });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("omits attribution for hidden images", () => {
    show({ isHidden: true });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
