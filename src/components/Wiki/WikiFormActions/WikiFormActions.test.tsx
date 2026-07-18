import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../i18n/I18nProvider";

import { WikiFormActions } from "./index";

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider initialLocale="en">{ui}</I18nProvider>);

describe("WikiFormActions", () => {
  afterEach(() => cleanup());

  it("renders save and cancel buttons", () => {
    renderWithI18n(<WikiFormActions onCancel={() => {}} />);

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onCancel", () => {
    const onCancel = vi.fn();

    renderWithI18n(<WikiFormActions onCancel={onCancel} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);

    expect(onCancel).toHaveBeenCalled();
  });
});
