import { expect, it } from "vitest";
import boundaries from "./regionalBoundaries.json";
import coverage from "./regionalMapCoverage.json";
import { projectRegions, supportedMapCountry } from "./regionalProjection";
it("covers every backend area exactly once with actual closed boundary rings", () => {
  expect(boundaries.map((x) => x.code)).toEqual(coverage.codes);
  expect(new Set(boundaries.map((x) => x.code)).size).toBe(
    coverage.codes.length,
  );
  for (const shape of boundaries) {
    expect(shape.polygons.length, shape.code).toBeGreaterThan(0);
    for (const ring of shape.polygons.flat()) {
      expect(ring.length, shape.code).toBeGreaterThanOrEqual(4);
      expect(ring[0]).toEqual(ring.at(-1));
    }
  }
});
it.each(["JP", "KR", "US", "AU", "CA", "NZ", "CN", "TW", "TH", "PH", "VN"])(
  "fits %s including offshore/dateline islands inside the viewport",
  (country) => {
    expect(supportedMapCountry(country)).toBe(true);
    const projected = projectRegions(country, "area");
    expect(projected.length).toBeGreaterThan(0);
    for (const shape of projected) {
      expect(shape.path, shape.code).not.toMatch(/NaN|Infinity/);
      expect(shape.path, shape.code).toBeTruthy();
      for (const [x, y] of shape.bounds) {
        expect(x).toBeGreaterThanOrEqual(9);
        expect(x).toBeLessThanOrEqual(691);
        expect(y).toBeGreaterThanOrEqual(9);
        expect(y).toBeLessThanOrEqual(451);
      }
    }
  },
);
it("keeps PH parent regions and provinces on separate map levels, without combining their values", () => {
  const parents = projectRegions("PH", "region");
  const children = projectRegions("PH", "area");
  expect(parents.some((x) => x.code === "PH-00")).toBe(true);
  expect(children.some((x) => x.code === "PH-MGN")).toBe(true);
  expect(parents.some((x) => children.some((y) => x.code === y.code))).toBe(
    false,
  );
  expect(supportedMapCountry("DE")).toBe(false);
});
