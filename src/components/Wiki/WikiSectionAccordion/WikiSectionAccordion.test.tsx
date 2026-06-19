import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { wikiStorySection } from "../storybook/fixtures";
import { WikiSectionAccordion } from "./index";

describe("WikiSectionAccordion", () => {
  afterEach(() => cleanup());

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

  it("renders section edit links without using the accordion toggle", () => {
    render(
      <WikiSectionAccordion
        editHref="/wiki/ja/gr-aurora-echo/edit"
        language="ja"
        section={wikiStorySection}
      />,
    );

    const section = screen.getByTestId(`section-${wikiStorySection.sectionIdentifier}`);
    const editLink = screen.getByRole("link", {
      name: `Edit section ${wikiStorySection.title}`,
    });

    expect(section).not.toHaveAttribute("open");
    expect(editLink).toHaveAttribute("href", "/wiki/ja/gr-aurora-echo/edit");
    editLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(editLink);
    expect(section).not.toHaveAttribute("open");
  });
});
