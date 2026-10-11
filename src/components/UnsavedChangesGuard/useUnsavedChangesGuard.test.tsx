import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelPageLeave, confirmPageLeave, useUnsavedChangesGuard } from "./useUnsavedChangesGuard";

const message = "Unsaved changes will be lost. Leave?";
const link = (href: string, target?: string) => {
  const anchor = document.createElement("a");
  anchor.href = href;
  if (target) anchor.target = target;
  document.body.append(anchor);
  return anchor;
};
const unload = () => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

afterEach(() => {
  cleanup();
  document.querySelectorAll("a").forEach((anchor) => anchor.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useUnsavedChangesGuard", () => {
  it("keeps edits when link navigation is cancelled, and removes the guard after saving", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { rerender, unmount } = renderHook(({ dirty }) => useUnsavedChangesGuard(dirty, message), { initialProps: { dirty: true } });
    const anchor = link("/another-page");
    const navigate = vi.fn((event: Event) => event.preventDefault());
    anchor.addEventListener("click", navigate);
    fireEvent.click(anchor);
    expect(confirm).toHaveBeenCalledWith(message);
    expect(navigate).not.toHaveBeenCalled();
    expect(unload().defaultPrevented).toBe(true);
    rerender({ dirty: false });
    fireEvent.click(anchor);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(unload().defaultPrevented).toBe(false);
    unmount();
  });

  it("allows staying on the page and opening a separate tab without warning", () => {
    const confirm = vi.spyOn(window, "confirm");
    renderHook(() => useUnsavedChangesGuard(true, message));
    for (const anchor of [link(`${window.location.href}#section`), link("/other", "_blank"), link("/other")]) {
      anchor.addEventListener("click", (event) => event.preventDefault());
      fireEvent.click(anchor, { ctrlKey: anchor.target !== "_blank" && anchor.pathname === "/other" });
    }
    expect(confirm).not.toHaveBeenCalled();
  });

  it("guards browser history navigation and permits confirmed departures", () => {
    const navigation = new EventTarget();
    vi.stubGlobal("navigation", navigation);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHook(() => useUnsavedChangesGuard(true, message));
    const navigate = () => {
      const event = new Event("navigate", { cancelable: true });
      Object.assign(event, { destination: { url: new URL("/previous-page", window.location.href).href }, hashChange: false, navigationType: "traverse" });
      act(() => { navigation.dispatchEvent(event); });
      return event;
    };
    expect(navigate().defaultPrevented).toBe(true);
    confirm.mockReturnValue(true);
    expect(navigate().defaultPrevented).toBe(false);
  });
});

it("keeps approval across an asynchronous action and restores the guard if the action fails", () => {
  const navigation = new EventTarget();
  vi.stubGlobal("navigation", navigation);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  const { rerender } = renderHook(({ message }) => useUnsavedChangesGuard(true, message), { initialProps: { message } });
  expect(confirmPageLeave("/login")).toBe(true);
  rerender({ message: "Translated warning" });
  const event = new Event("navigate", { cancelable: true });
  Object.assign(event, { destination: { url: new URL("/login", window.location.href).href }, hashChange: false, navigationType: "replace" });
  navigation.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(unload().defaultPrevented).toBe(false);
  expect(confirm).toHaveBeenCalledTimes(1);
  cancelPageLeave();
  expect(unload().defaultPrevented).toBe(true);
});
