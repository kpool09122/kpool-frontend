import { StrictMode, type MouseEvent } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), push: vi.fn() }));
vi.mock("@/gateways/wiki/draftWiki", () => ({ resolveWikiEditDestination: mocks.resolve }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
import { useWikiEditEntry } from "./useWikiEditEntry";

const source = { language: "ko", slug: "gr-twice", themeColor: "#fff" };
const event = (overrides = {}) => ({ button: 0, preventDefault: vi.fn(), ...overrides }) as unknown as MouseEvent<HTMLAnchorElement>;

describe("public Wiki edit action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolve.mockResolvedValue("/wiki/draft-1/edit?resourceType=group");
  });
  afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

  it("does not prepare a draft while normally viewing a detail", () => {
    renderHook(() => useWikiEditEntry(source));
    expect(mocks.resolve).not.toHaveBeenCalled();
  });

  it("waits for the ID before navigating and ignores repeated clicks while preparing", async () => {
    let complete!: (href: string) => void;
    mocks.resolve.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    const { result } = renderHook(() => useWikiEditEntry(source));
    const click = event();
    act(() => { result.current.startEditing(click); result.current.startEditing(click); });
    expect(click.preventDefault).toHaveBeenCalled();
    expect(mocks.resolve).toHaveBeenCalledExactlyOnceWith({ ...source, fallbackErrorMessage: "Wikiを読み込めません" });
    expect(mocks.push).not.toHaveBeenCalled();
    await act(async () => complete("/wiki/new-draft/edit?resourceType=group"));
    expect(mocks.push).toHaveBeenCalledWith("/wiki/new-draft/edit?resourceType=group");
  });

  it("resumes the edit intent once after returning to the detail, including Strict Mode", async () => {
    window.history.replaceState(null, "", "/ko/wiki/gr-twice?edit=1&themeColor=%23fff");
    renderHook(() => useWikiEditEntry(source, true), { wrapper: StrictMode });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/wiki/draft-1/edit?resourceType=group"));
    expect(mocks.resolve).toHaveBeenCalledTimes(1);
    expect(window.location.pathname + window.location.search).toBe("/ko/wiki/gr-twice?themeColor=%23fff");
  });

  it("does not resume a consumed edit intent when returning to cached detail data", () => {
    window.history.replaceState(null, "", "/ko/wiki/gr-twice?themeColor=%23fff");
    renderHook(() => useWikiEditEntry(source, true));
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("stays on the detail and allows retry when preparation fails", async () => {
    mocks.resolve.mockRejectedValueOnce(new Error("Creation failed"));
    const { result } = renderHook(() => useWikiEditEntry(source));
    act(() => result.current.startEditing(event()));
    await waitFor(() => expect(result.current.error).toBe("Creation failed"));
    expect(mocks.push).not.toHaveBeenCalled();
    act(() => result.current.startEditing(event()));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));
  });

  it("lets modified clicks use the compatibility link in a separate tab", () => {
    const { result } = renderHook(() => useWikiEditEntry(source));
    const click = event({ ctrlKey: true });
    act(() => result.current.startEditing(click));
    expect(click.preventDefault).not.toHaveBeenCalled();
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
});
