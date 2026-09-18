import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TermsPage, { generateMetadata } from "./page";

describe("TermsPage", () => {
  it("renders the English governing-law and contact sections", async () => {
    render(await TermsPage({ params: Promise.resolve({ language: "en" }) }));

    expect(screen.getByRole("heading", { level: 1, name: "K-Pool Terms of Service" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "14. Governing Law and Jurisdiction" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "K-Pool contact form" })).toHaveLength(2);
    for (const link of screen.getAllByRole("link", { name: "K-Pool contact form" })) {
      expect(link).toHaveAttribute("href", "/contact");
    }
  });

  it("provides localized metadata", async () => {
    await expect(generateMetadata({ params: Promise.resolve({ language: "ja" }) })).resolves.toMatchObject({
      title: "K-Pool 利用規約",
    });
  });
});
