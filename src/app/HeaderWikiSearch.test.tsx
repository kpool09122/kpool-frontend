import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render as renderView, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchPublicWikis, type PublicWikiSearchItem } from "@/gateways/wiki/publicWikiSearchBrowserApi";
import { HeaderWikiSearch } from "./HeaderWikiSearch";
import { Header } from "./Header";
import { I18nProvider } from "@/i18n/I18nProvider";
import { useUnsavedChangesGuard } from "@/components/UnsavedChangesGuard/useUnsavedChangesGuard";

const render = (ui: ReactElement) => {
  const client = new QueryClient();
  return renderView(ui, { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
};

vi.mock("@/gateways/wiki/publicWikiSearchBrowserApi", () => ({ searchPublicWikis: vi.fn() }));
const twice = { wikiIdentifier: "1", name: "TWICE", language: "ja", slug: "gr-twice" };
const search = vi.mocked(searchPublicWikis);
const type = (value: string) => fireEvent.change(screen.getByRole("combobox"), { target: { value } });
const tick = async (ms = 500) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

beforeEach(() => { notifyManager.setScheduler(queueMicrotask); vi.useFakeTimers(); search.mockReset(); search.mockResolvedValue([twice]); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); notifyManager.setScheduler((callback) => setTimeout(callback, 0)); });

describe("HeaderWikiSearch", () => {
  it("waits for 500ms of inactivity and skips blank input", async () => {
    render(<HeaderWikiSearch language="ja" />);
    type("  ");
    await tick();
    expect(search).not.toHaveBeenCalled();
    type("T");
    await tick(400);
    type("TWICE");
    await tick(499);
    expect(search).not.toHaveBeenCalled();
    await tick(1);
    expect(search).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith("ja", "TWICE", expect.any(AbortSignal));
    expect(screen.getByRole("option", { name: "TWICE" })).toHaveAttribute("href", "/ja/wiki/gr-twice");
    type(" TWICE ");
    await tick();
    expect(search).toHaveBeenCalledOnce();
    expect(screen.getByRole("option", { name: "TWICE" })).toBeInTheDocument();
  });

  it("aborts old requests and ignores late responses after changing or clearing input", async () => {
    let resolveOld!: (items: PublicWikiSearchItem[]) => void;
    search.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    render(<HeaderWikiSearch language="ja" />);
    type("old");
    await tick();
    const oldSignal = search.mock.calls[0][2];
    type("new");
    expect(oldSignal.aborted).toBe(true);
    await tick();
    await act(async () => resolveOld([{ ...twice, name: "Old result" }]));
    expect(screen.queryByText("Old result")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "TWICE" })).toBeInTheDocument();
    type("");
    await tick();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(search).toHaveBeenCalledTimes(2);
  });

  it("waits until IME composition ends", async () => {
    render(<HeaderWikiSearch language="ja" />);
    fireEvent.compositionStart(screen.getByRole("combobox"));
    type("トゥワイス");
    await tick(1000);
    expect(search).not.toHaveBeenCalled();
    fireEvent.compositionEnd(screen.getByRole("combobox"));
    await tick(499);
    expect(search).not.toHaveBeenCalled();
    await tick(1);
    expect(search).toHaveBeenCalledWith("ja", "トゥワイス", expect.any(AbortSignal));
  });

  it("selects candidates with arrows and Enter and preserves the editor leave guard", async () => {
    function Editor() {
      useUnsavedChangesGuard(true, "Unsaved changes");
      return <HeaderWikiSearch language="ja" />;
    }
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Editor />);
    type("twice");
    await tick();
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option").id);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(confirm).toHaveBeenCalledWith("Unsaved changes");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on blur and cancels pending searches", async () => {
    render(<HeaderWikiSearch language="ja" />);
    type("TWICE");
    fireEvent.blur(screen.getByRole("combobox"), { relatedTarget: document.body });
    await tick();
    expect(search).not.toHaveBeenCalled();
    fireEvent.focus(screen.getByRole("combobox"));
    await tick();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.blur(screen.getByRole("combobox"), { relatedTarget: document.body });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows empty and error messages in the search language", async () => {
    search.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("unavailable"));
    render(<HeaderWikiSearch language="ko" />);
    type("none");
    await tick();
    expect(search).toHaveBeenCalledWith("ko", "none", expect.any(AbortSignal));
    expect(screen.getByRole("status")).toHaveTextContent("검색 결과가 없습니다");
    type("error");
    await tick();
    expect(screen.getByRole("status")).toHaveTextContent("검색하지 못했습니다");
  });

  it("cancels pending search when unmounted", async () => {
    const { unmount } = render(<HeaderWikiSearch language="en" />);
    type("TWICE");
    unmount();
    await tick();
    expect(search).not.toHaveBeenCalled();
  });

  it("clears suggestions and switches the search language with the header locale", async () => {
    render(<I18nProvider initialLocale="ja"><Header /></I18nProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Wikiを検索" }));
    const input = screen.getByRole("combobox", { name: "Wikiを検索" });
    fireEvent.change(input, { target: { value: "TWICE" } });
    await tick();
    fireEvent.click(screen.getByRole("button", { name: "検索を閉じる" }));
    fireEvent.change(screen.getByRole("combobox", { name: "言語" }), { target: { value: "en" } });
    fireEvent.click(screen.getByRole("button", { name: "Search Wikis" }));
    const englishInput = screen.getByRole("combobox", { name: "Search Wikis" });
    expect(englishInput).toHaveValue("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    fireEvent.change(englishInput, { target: { value: "TWICE" } });
    await tick();
    expect(search).toHaveBeenLastCalledWith("en", "TWICE", expect.any(AbortSignal));
  });

  it("opens search, hides header navigation and restores it on close", async () => {
    search.mockImplementation(() => new Promise(() => undefined));
    render(<I18nProvider initialLocale="ja"><Header /></I18nProvider>);
    const open = screen.getByRole("button", { name: "Wikiを検索" });
    expect(screen.queryByRole("combobox", { name: "Wikiを検索" })).not.toBeInTheDocument();
    fireEvent.click(open);
    const input = screen.getByRole("combobox", { name: "Wikiを検索" });
    expect(screen.queryByRole("combobox", { name: "言語" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ナビゲーションメニュー" })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "TWICE" } });
    await tick();
    const signal = search.mock.calls[0][2];
    fireEvent.click(screen.getByRole("button", { name: "検索を閉じる" }));
    expect(signal.aborted).toBe(true);
    expect(screen.getByRole("combobox", { name: "言語" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Wikiを検索" }));
    expect(screen.getByRole("combobox", { name: "Wikiを検索" })).toHaveValue("");
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Wikiを検索" }), { key: "Escape" });
    expect(screen.queryByRole("combobox", { name: "Wikiを検索" })).not.toBeInTheDocument();
  });
});
