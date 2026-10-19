import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "@/i18n/I18nProvider";
import { LocalizedForm } from "./index";

function Form() {
  const { setLocale } = useI18n();
  return <>
    <button onClick={() => setLocale("ko")}>한국어</button>
    <LocalizedForm><label>Email<input name="email" required type="email" /></label></LocalizedForm>
  </>;
}

describe("LocalizedForm", () => {
  it("forwards object refs and honors callback ref cleanup", () => {
    const objectRef = createRef<HTMLFormElement>();
    const view = render(<LocalizedForm ref={objectRef} />);
    expect(objectRef.current?.tagName).toBe("FORM");
    const release = vi.fn();
    const callbackRef = vi.fn(() => release);
    view.rerender(<LocalizedForm ref={callbackRef} />);
    expect(objectRef.current).toBeNull();
    expect(callbackRef.mock.calls).toHaveLength(1);
    view.unmount();
    expect(release).toHaveBeenCalledOnce();
  });

  it("localizes native validation, changes existing errors with the UI locale, and clears errors on input", () => {
    render(<I18nProvider initialLocale="ja"><Form /></I18nProvider>);
    const input = screen.getByLabelText<HTMLInputElement>("Email");
    expect(input.checkValidity()).toBe(false);
    expect(input.validationMessage).toBe("入力してください。");
    fireEvent.click(screen.getByRole("button", { name: "한국어" }));
    expect(input.validationMessage).toBe("입력하세요.");
    fireEvent.input(input, { target: { value: "invalid" } });
    expect(input.checkValidity()).toBe(false);
    expect(input.validationMessage).toBe("올바른 이메일 주소를 입력하세요.");
    fireEvent.input(input, { target: { value: "user@example.com" } });
    expect(input.checkValidity()).toBe(true);
    expect(input.validationMessage).toBe("");
  });
});
