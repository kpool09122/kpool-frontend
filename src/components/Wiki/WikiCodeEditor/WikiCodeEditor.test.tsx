import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WikiCodeEditor } from "./index";

describe("WikiCodeEditor", () => {
  it("disables code editing and clear actions", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();

    render(
      <WikiCodeEditor
        code="== Overview ==\n\nLocked content"
        disabled
        errorMessage="Invalid wiki code"
        onChange={onChange}
        onClear={onClear}
        warnings={[]}
      />,
    );

    const textarea = screen.getByLabelText("Wiki code");
    const clearButton = screen.getByRole("button", { name: "Clear invalid code" });

    expect(textarea).toBeDisabled();
    expect(clearButton).toBeDisabled();

    fireEvent.change(textarea, {
      target: { value: "== Changed ==" },
    });
    fireEvent.click(clearButton);

    expect(onChange).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });
});
