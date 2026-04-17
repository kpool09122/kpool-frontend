import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { wikiStoryBasic } from "../storybook/fixtures";
import { cardSurfaceStyle } from "../styles";
import { WikiBasicFieldsList } from "./index";

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
});
