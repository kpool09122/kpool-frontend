import assert from "node:assert/strict";
import test from "node:test";
import { buildCountryShapes } from "./generate-analyze-map.mjs";

const ring = [[0, 0], [0.1, 0.01], [2, 0], [2, 2], [0, 2], [0, 0]];
const feature = (code, geometry = { type: "Polygon", coordinates: [ring] }) => ({
  properties: { "ISO3166-1-Alpha-2": code, name: code }, geometry,
});

test("normalizes Taiwan separately from China and preserves unknown countries", () => {
  const shapes = buildCountryShapes({ features: [feature("CN-TW"), feature("CN"), feature("-99")] });
  assert.deepEqual(shapes.map(({ code }) => code), ["TW", "CN", null]);
  assert.throws(() => buildCountryShapes({ features: [feature("invalid")] }), /Unsupported country code/);
});

test("simplifies exterior rings, keeps separate polygons and excludes holes", () => {
  const shapes = buildCountryShapes({ features: [feature("JP", {
    type: "MultiPolygon", coordinates: [[ring, ring], [ring]],
  })] });
  const exterior = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]];
  assert.deepEqual(shapes[0].rings, [exterior, exterior]);
});

test("preserves the previous coordinate rounding, including exact midpoints", () => {
  const coordinates = [[[1.125, -1.375], [2.675, -1.375], [2.675, 1.125], [1.125, 1.125], [1.125, -1.375]]];
  const shapes = buildCountryShapes({ features: [feature("TW", { type: "Polygon", coordinates })] });
  assert.deepEqual(shapes[0].rings[0], [[1.12, -1.38], [2.67, -1.38], [2.67, 1.12], [1.12, 1.12], [1.12, -1.38]]);
});
