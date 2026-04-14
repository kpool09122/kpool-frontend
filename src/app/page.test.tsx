import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renders the getting started copy", () => {
    render(React.createElement(Home));

    expect(screen.getByText(/Get started by editing/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Read our docs/i,
      }),
    ).toHaveAttribute("href", expect.stringContaining("nextjs.org/docs"));
  });
});
