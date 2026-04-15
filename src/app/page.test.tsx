import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renders the theme preview copy and palette sections", () => {
    render(React.createElement(Home));

    expect(
      screen.getByRole("heading", {
        name: /Trust-forward colors for a calm, premium first impression/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Theme token preview/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Brand palette/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("--brand-primary"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Deep Harbor/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /toggle color theme/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Open Wiki Detail Demo/i,
      }),
    ).toHaveAttribute("href", "/wiki/aurora-echo");
  });
});
