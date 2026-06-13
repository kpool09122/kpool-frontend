import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { wikiStoryBasic } from "../storybook/fixtures";
import { cardSurfaceStyle } from "../styles";
import { WikiBasicFieldsList } from "./index";

const longSocialUrl =
  "https://www.youtube.com/HYBELABELShttps://twitter.com/HYBEOFFICIALtwt-super-long-unbroken-profile-link-value";
const expectWrappedText = (element: Element | null) => {
  expect(element).not.toBeNull();
  expect(element).toHaveClass("min-w-0");
  expect(element).toHaveClass("break-words");
  expect(element?.className).toContain("[overflow-wrap:anywhere]");
  expect(element?.className).toContain("[word-break:break-word]");
};

describe("WikiBasicFieldsList", () => {
  afterEach(() => cleanup());

  it("renders wiki basic field labels and values", () => {
    render(
      <WikiBasicFieldsList
        basic={wikiStoryBasic}
        className="grid gap-4"
        itemClassName="rounded-xl"
        itemStyle={cardSurfaceStyle}
      />,
    );

    expect(screen.getByText("Group Type")).toBeInTheDocument();
    expect(screen.getByText("Girl Group")).toBeInTheDocument();
    expect(screen.getByText("Agency")).toBeInTheDocument();
  });

  it("renders basic relation names as public wiki links", () => {
    render(
      <WikiBasicFieldsList
        basic={{
          ...wikiStoryBasic,
          groups: [
            {
              wikiIdentifier: "group-wiki-1",
              slug: "gr-twice",
              language: "ko",
              name: "TWICE",
              normalizedName: "twice",
            },
          ],
        }}
        className="grid gap-4"
        itemClassName="rounded-xl"
        itemStyle={cardSurfaceStyle}
      />,
    );

    expect(screen.getByRole("link", { name: "TWICE" })).toHaveAttribute(
      "href",
      "/wiki/ko/gr-twice",
    );
  });

  it("applies wrapping classes to long social link values", () => {
    render(
      <WikiBasicFieldsList
        basic={{
          ...wikiStoryBasic,
          resourceType: "agency",
          socialLinks: [longSocialUrl],
        }}
        className="grid gap-4"
        itemClassName="rounded-xl"
        itemStyle={cardSurfaceStyle}
      />,
    );

    expectWrappedText(screen.getByText(longSocialUrl));
  });

  it("applies wrapping classes to basic relation links", () => {
    render(
      <WikiBasicFieldsList
        basic={{
          ...wikiStoryBasic,
          groups: [
            {
              wikiIdentifier: "group-wiki-1",
              slug: "gr-super-long-unbroken-profile-slug-value",
              language: "ko",
              name: "SUPERLONGUNBROKENGROUPNAMETHATSHOULDWRAP",
              normalizedName: "superlongunbrokengroupnamethatshouldwrap",
            },
          ],
        }}
        className="grid gap-4"
        itemClassName="rounded-xl"
        itemStyle={cardSurfaceStyle}
      />,
    );

    expectWrappedText(
      screen.getByRole("link", { name: "SUPERLONGUNBROKENGROUPNAMETHATSHOULDWRAP" }),
    );
  });
});
