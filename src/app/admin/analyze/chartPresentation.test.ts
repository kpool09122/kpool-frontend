import { expect, it } from "vitest";
import { trendDomain } from "./chartPresentation";

it("zooms around high, close values with padding on both sides", () => {
  const [min, max] = trendDomain([9250, null, 9256]);
  expect(min).toBeGreaterThan(9200);
  expect(min).toBeLessThan(9250);
  expect(max).toBeGreaterThan(9256);
});
it("keeps constant series visible and includes actual measured zero", () => {
  const [min, max] = trendDomain([100, 100]);
  expect(min).toBeGreaterThan(0);
  expect(min).toBeLessThan(100);
  expect(max).toBeGreaterThan(100);
  expect(trendDomain([0, 10])[0]).toBe(0);
  expect(trendDomain([null, null])).toEqual([0, 1]);
});
it("preserves small fractional changes for average time", () => {
  const [min, max] = trendDomain([95.58, 95.59], true);
  expect(min).toBeGreaterThan(95.5);
  expect(min).toBeLessThan(95.58);
  expect(max).toBeGreaterThan(95.59);
});
