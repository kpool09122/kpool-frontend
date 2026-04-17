import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WikiFormActions } from "./index";

describe("WikiFormActions", () => {
  afterEach(() => cleanup());

  it("renders save and cancel buttons", () => {
    render(<WikiFormActions onCancel={() => {}} />);

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onCancel", () => {
    const onCancel = vi.fn();

    render(<WikiFormActions onCancel={onCancel} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);

    expect(onCancel).toHaveBeenCalled();
  });
});
