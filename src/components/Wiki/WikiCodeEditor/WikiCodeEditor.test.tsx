import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "../../../i18n/I18nProvider";

import { WikiCodeEditor } from "./index";

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider initialLocale="en">{ui}</I18nProvider>);

afterEach(() => cleanup());

describe("WikiCodeEditor", () => {
  it("disables code editing and clear actions", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();

    renderWithI18n(
      <WikiCodeEditor
        code="== Overview ==\n\nLocked content"
        disabled
        errorCode="invalidMacro"
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

it("translates parser diagnostics when the UI language changes without replacing code", () => {
  const props = { code: "broken code", errorCode: "headingRequired" as const, warnings: [], onChange: vi.fn(), onClear: vi.fn() };
  function Editor() {
    const { setLocale } = useI18n();
    return <><button onClick={() => setLocale("ko")}>한국어</button><WikiCodeEditor {...props} /></>;
  }
  render(<I18nProvider initialLocale="ja"><Editor /></I18nProvider>);
  expect(screen.getByRole("alert")).toHaveTextContent("最上位の見出し");
  fireEvent.click(screen.getByRole("button", { name: "한국어" }));
  expect(screen.getByRole("alert")).toHaveTextContent("최상위 제목");
  expect(screen.getByTestId("wiki-code-textarea")).toHaveValue("broken code");
  expect(props.onChange).not.toHaveBeenCalled();
});
