import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WikiStatePanel } from "./index";

describe("WikiStatePanel", () => {
  afterEach(() => cleanup());

  it("renders title and message", () => {
    render(<WikiStatePanel message="Loading wiki" title="Loading" />);

    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(screen.getByText("Loading wiki")).toBeInTheDocument();
  });

  it("renders the danger tone content", () => {
    render(<WikiStatePanel message="Failed to load" title="Error" tone="danger" />);

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });
});
