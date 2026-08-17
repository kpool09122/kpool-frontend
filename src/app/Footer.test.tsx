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

    expect(screen.getByText("© K-Pool")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "お問い合わせ" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(footer).toHaveClass("bg-surface-raised/95", "border-t");
    expect(content).toHaveClass("w-[90%]", "py-4");
    expect(content).not.toHaveClass("border-t");
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
