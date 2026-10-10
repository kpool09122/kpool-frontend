import { afterEach, describe, expect, it, vi } from "vitest";
import { applyThemeMode, readThemeMode, resolveNextThemeMode, resolveThemeMode, themeBootstrapScript } from "./themeMode";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete document.documentElement.dataset.theme; delete document.documentElement.dataset.themePersistence; });

describe("theme modes", () => {
  it("toggles both modes", () => {
    expect(resolveNextThemeMode("light")).toBe("dark");
    expect(resolveNextThemeMode("dark")).toBe("light");
  });
  it.each([true, false])("prefers valid saved values over OS dark=%s", (dark) => {
    expect(resolveThemeMode("light", dark)).toBe("light");
    expect(resolveThemeMode("dark", dark)).toBe("dark");
  });
  it.each([null, "invalid", "Dark", "system", ""]) ("falls back to OS for %s", (stored) => {
    expect(resolveThemeMode(stored, true)).toBe("dark");
    expect(resolveThemeMode(stored, false)).toBe("light");
  });
  it("uses OS when storage access throws, and applies unsaved choices in memory", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new Error("blocked"); });
    expect(readThemeMode()).toBe("dark");
    applyThemeMode("light", true);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.themePersistence).toBe("unavailable");
  });
  it.each(["light", "dark", "invalid", null])("restores %s before content paint without writing storage", (stored) => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem: () => stored, setItem });
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    // Execute the exact static script embedded by the server layout.
    new Function(themeBootstrapScript)();
    expect(document.documentElement.dataset.theme).toBe(resolveThemeMode(stored, true));
    expect(setItem).not.toHaveBeenCalled();
  });
  it("bootstrap survives a denied storage read", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new Error("blocked"); });
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    new Function(themeBootstrapScript)();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
