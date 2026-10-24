import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContactDialog } from "./ContactDialog";

const closeEvents: HTMLDialogElement[] = [];
const showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
const close = vi.fn(function (this: HTMLDialogElement) {
  if (!this.open) return;
  this.removeAttribute("open");
  // Browsers queue close events rather than dispatching them inside close().
  closeEvents.push(this);
});
function flushCloseEvents() {
  act(() => { for (const dialog of closeEvents.splice(0)) fireEvent(dialog, new Event("close")); });
}
function nativeClose(dialog: HTMLDialogElement) {
  act(() => { dialog.close(); });
  flushCloseEvents();
}
function Harness({ disabled = false, onClose = vi.fn(), deferClose = false }: { disabled?: boolean; onClose?: () => void; deferClose?: boolean }) {
  const fallbackFocusRef = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState(true);
  const [draft, setDraft] = useState("返信の下書き");
  return <>
    <button ref={fallbackFocusRef}>一覧</button>
    <output>{selected ? "selected" : "released"}</output>
    {selected ? <ContactDialog title="お問い合わせ" closeLabel="閉じる" closeDisabled={disabled} viewKey="contact" fallbackFocusRef={fallbackFocusRef} onClose={() => {
      onClose();
      if (!deferClose) setSelected(false);
    }}>
      <textarea aria-label="返信" value={draft} disabled={disabled} onChange={(event) => setDraft(event.currentTarget.value)} />
      {disabled ? <p>送信中</p> : null}
    </ContactDialog> : null}
  </>;
}
beforeEach(() => {
  closeEvents.length = 0;
  showModal.mockClear();
  close.mockClear();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("scrollX", 24);
  vi.stubGlobal("scrollY", 720);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: showModal });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: close });
});
afterEach(() => {
  cleanup();
  delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
  delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
  vi.unstubAllGlobals();
});

describe("ContactDialog native close synchronization", () => {
  it.each([true, false])("reopens a disabled native-closed dialog and retains draft, pending and body lock (showModal=%s)", (modalSupported) => {
    if (!modalSupported) delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
    const onClose = vi.fn();
    render(<Harness disabled onClose={onClose} />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    fireEvent(dialog, new Event("cancel", { cancelable: false }));
    nativeClose(dialog);
    expect(dialog.open).toBe(true);
    expect(screen.getByRole("textbox")).toHaveValue("返信の下書き");
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByText("送信中")).toBeInTheDocument();
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-720px");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("releases parent selection and restores scroll on enabled native close", () => {
    const originalBody = document.body.style.cssText;
    const originalRoot = document.documentElement.style.cssText;
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    nativeClose(screen.getByRole("dialog") as HTMLDialogElement);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText("released")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.cssText).toBe(originalBody);
    expect(document.documentElement.style.cssText).toBe(originalRoot);
    expect(window.scrollTo).toHaveBeenLastCalledWith({ left: 24, top: 720, behavior: "instant" });
    flushCloseEvents();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(["cancel", "button"])("notifies once when %s is followed by native close before parent removal", (source) => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} deferClose />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    if (source === "cancel") fireEvent(dialog, new Event("cancel", { cancelable: false }));
    else fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    nativeClose(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses the committed disabled state when a queued close arrives after pending starts", () => {
    const onClose = vi.fn();
    const view = render(<Harness onClose={onClose} />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    act(() => { dialog.close(); });
    view.rerender(<Harness disabled onClose={onClose} />);
    flushCloseEvents();
    expect(dialog.open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("uses the committed enabled state when a queued close arrives after pending ends", () => {
    const onClose = vi.fn();
    const view = render(<Harness disabled onClose={onClose} />);
    act(() => { (screen.getByRole("dialog") as HTMLDialogElement).close(); });
    view.rerender(<Harness onClose={onClose} />);
    flushCloseEvents();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText("released")).toBeInTheDocument();
  });

  it.each([true, false])("ignores queued StrictMode cleanup close events (disabled=%s)", (disabled) => {
    const onClose = vi.fn();
    render(<StrictMode><Harness disabled={disabled} onClose={onClose} /></StrictMode>);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    expect(closeEvents.length).toBeGreaterThan(0);
    flushCloseEvents();
    expect(dialog.open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.style.position).toBe("fixed");
  });

  it("does not reopen a disconnected dialog", () => {
    const onClose = vi.fn();
    const view = render(<Harness disabled onClose={onClose} />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    dialog.remove();
    nativeClose(dialog);
    expect(dialog.open).toBe(false);
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    // Restore React's DOM ownership before unmounting.
    view.container.appendChild(dialog);
  });

  it.each([true, false])("ignores asynchronous close events after unmount (disabled=%s)", (disabled) => {
    const onClose = vi.fn();
    const view = render(<Harness disabled={disabled} onClose={onClose} />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    view.unmount();
    flushCloseEvents();
    expect(dialog.open).toBe(false);
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.style.position).not.toBe("fixed");
  });
});
