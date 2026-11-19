import { describe, expect, it } from "vitest";
import { centimetersToFeetAndInches, feetAndInchesToCentimeters, formatWikiHeight } from "./wikiHeight";

describe("Wiki height conversion", () => {
  it("converts imperial input into integer centimeters", () => {
    expect(feetAndInchesToCentimeters(5, 7)).toBe(170);
    expect(feetAndInchesToCentimeters(5, 7.5)).toBe(171);
    expect(feetAndInchesToCentimeters(0, 10)).toBe(25);
  });

  it("preserves integer centimeters when converting back from editable inches", () => {
    for (let cm = 0; cm <= 300; cm++) {
      const { feet, inches } = centimetersToFeetAndInches(cm);
      expect(inches).toBeLessThan(12);
      expect(feetAndInchesToCentimeters(feet, inches)).toBe(cm);
    }
  });

  it("shows both units and carries rounded inches into feet", () => {
    expect(formatWikiHeight(170)).toBe(`170 cm / 5' 7"`);
    expect(formatWikiHeight(182)).toBe(`182 cm / 6' 0"`);
  });
});
