import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../i18n/I18nProvider";
import { Footer } from "./Footer";

describe("Footer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a contact link without a logo image", () => {
    const { container } = render(
      <I18nProvider initialLocale="ja">
        <Footer />
      </I18nProvider>,
    );

    const footer = container.querySelector("footer");
    const content = footer?.firstElementChild;

    expect(screen.getByText("© k-pool")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "フッターリンク" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "利用規約" })).toHaveAttribute(
      "href",
      "/ja/terms",
    );
    expect(screen.getByRole("link", { name: "プライバシーポリシー" })).toHaveAttribute(
      "href",
      "/ja/privacy",
    );
    expect(screen.getByRole("link", { name: "お問い合わせ" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/take0122",
    );
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute("target", "_blank");
    expect(footer).toHaveClass("bg-surface-raised/95", "border-t");
    expect(content).toHaveClass("w-[90%]", "py-4", "flex-wrap");
    expect(content).not.toHaveClass("border-t");
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it.each([
    ["en", "Terms of Service", "Privacy Policy"],
    ["ko", "이용약관", "개인정보 처리방침"],
  ] as const)("uses the selected %s locale in legal links", (locale, terms, privacy) => {
    render(
      <I18nProvider initialLocale={locale}>
        <Footer />
      </I18nProvider>,
    );

    expect(screen.getByRole("link", { name: terms })).toHaveAttribute(
      "href",
      `/${locale}/terms`,
    );
    expect(screen.getByRole("link", { name: privacy })).toHaveAttribute(
      "href",
      `/${locale}/privacy`,
    );
  });
});
