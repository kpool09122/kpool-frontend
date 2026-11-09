import { describe, expect, it } from "vitest";
import { createCountryFillScale } from "./countryColorPalette";

describe("country palette", () => {
  it("spreads close scores across the full light-to-dark range", () => {
    const scores = new Map(Array.from({ length: 13 }, (_, index) => [String(index), 0.5 + index / 1000]));
    const fills = createCountryFillScale(scores);
    expect(fills.get("0")).toBe("#ccfbf1");
    expect(fills.get("12")).toBe("#042f2e");
    expect(new Set(fills.values()).size).toBe(13);
  });
  it("uses exact metric ranks when floating point scores are indistinguishable", () => {
    const fills = createCountryFillScale(new Map([["JP", 1], ["KR", 1]]), new Map([["JP", 1], ["KR", 2]]));
    expect(fills.get("JP")).toBe("#042f2e");
    expect(fills.get("KR")).toBe("#ccfbf1");
  });
  it("keeps ties the same shade and known zero distinct from absent data", () => {
    const fills = createCountryFillScale(new Map([["JP", 0.75], ["KR", 0.75], ["IS", 0]]));
    expect(fills.get("JP")).toBe(fills.get("KR"));
    expect(fills.get("IS")).toBe("#f0fdfa");
    expect(fills.has("US")).toBe(false);
    expect(createCountryFillScale(new Map()).size).toBe(0);
  });
  it("does not split composite ties because of floating point summation noise", () => {
    const fills = createCountryFillScale(new Map([["JP", 0.3], ["KR", 0.1 + 0.2]]));
    expect(fills.get("JP")).toBe(fills.get("KR"));
  });
});
