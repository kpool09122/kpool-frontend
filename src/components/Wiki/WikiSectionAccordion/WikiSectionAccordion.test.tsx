import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { wikiStorySection } from "../storybook/fixtures";
import { WikiSectionAccordion } from "./index";

describe("WikiSectionAccordion", () => {
  it("renders the section summary closed by default", () => {
    render(<WikiSectionAccordion language="ja" section={wikiStorySection} />);

    const section = screen.getByTestId(`section-${wikiStorySection.sectionIdentifier}`);

    expect(section).not.toHaveAttribute("open");
    expect(screen.getByText(wikiStorySection.title)).toBeInTheDocument();
  });

  it("renders the section body content", () => {
    render(<WikiSectionAccordion language="ja" section={wikiStorySection} />);

    expect(
      screen.getAllByText(
        "The group balances brisk digital singles with a smaller number of concept-heavy mini albums.",
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Editable discography image").length).toBeGreaterThan(0);
  });
});
