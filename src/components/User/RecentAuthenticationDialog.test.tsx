import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { RecentAuthenticationDialog } from "./RecentAuthenticationDialog";

afterEach(cleanup);

describe("RecentAuthenticationDialog", () => {
  it("traps keyboard focus and restores the trigger when dismissed", () => {
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const { unmount } = render(<RecentAuthenticationDialog passkeyCount={1} linkedSocialProviders={["google"]} onClose={onClose} onSelect={vi.fn()} />);
    const first = screen.getByRole("button", { name: "Googleで本人確認" });
    const last = screen.getByRole("button", { name: "キャンセル" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("offers only registered methods and selects the chosen service", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<RecentAuthenticationDialog passkeyCount={0} linkedSocialProviders={["line", "line", "unknown"]} onClose={onClose} onSelect={onSelect} />);
    expect(screen.queryByRole("button", { name: "パスキーで本人確認" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Googleで本人確認" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "LINEで本人確認" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "LINEで本人確認" }));
    expect(onSelect).toHaveBeenCalledWith("line");
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    ["en", "Verify your identity", "Verify with Google"],
    ["ko", "본인 확인", "Google로 본인 확인"],
  ] as const)("uses the %s translations", (locale, title, label) => {
    render(<I18nProvider initialLocale={locale}><RecentAuthenticationDialog passkeyCount={1} linkedSocialProviders={["google"]} onClose={vi.fn()} onSelect={vi.fn()} /></I18nProvider>);
    expect(screen.getByRole("dialog", { name: title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });
});
