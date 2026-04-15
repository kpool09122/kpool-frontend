import { describe, expect, it } from "vitest";

import { resolveNextThemeMode } from "./themeMode";

describe("resolveNextThemeMode", () => {
  it("toggles light to dark", () => {
    expect(resolveNextThemeMode("light")).toBe("dark");
  });

  it("toggles dark to light", () => {
    expect(resolveNextThemeMode("dark")).toBe("light");
  });
});
