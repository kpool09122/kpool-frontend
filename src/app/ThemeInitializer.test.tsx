import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ThemeInitializer } from "./ThemeInitializer";
import { readThemeMode, themeStorageKey } from "./themeMode";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete document.documentElement.dataset.theme; delete document.documentElement.dataset.themePersistence; });

it("restores storage, synchronizes other tabs and falls back to OS on clear", () => {
  let stored: string | null = "light";
  const setItem = vi.fn();
  vi.stubGlobal("localStorage", { getItem: () => stored, setItem });
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  render(<ThemeInitializer />);
  expect(document.documentElement.dataset.theme).toBe("light");
  stored = "dark";
  window.dispatchEvent(new StorageEvent("storage", { key: themeStorageKey }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  stored = "light";
  window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  stored = null;
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(setItem).not.toHaveBeenCalled();
});

it("does not overwrite a prepaint or in-memory theme on mount", () => {
  document.documentElement.dataset.theme = "light";
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal("localStorage", { getItem: () => "dark" });
  expect(readThemeMode()).toBe("dark");
  render(<ThemeInitializer />);
  expect(document.documentElement.dataset.theme).toBe("light");
});
