/**
 * Generate bundled geographic country rings; no browser network or runtime dependency.
 * Source: datasets/geo-countries (Natural Earth), public domain.
 * https://www.naturalearthdata.com/about/terms-of-use/
 * Run: node scripts/generate-analyze-map.mjs
 * Boundaries are illustrative, not a statement about sovereignty.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = "https://raw.githubusercontent.com/datasets/geo-countries/ca3b7150caa5d3cc3fb108a87fc6e3d57bd97d99/data/countries.geojson";
const output = new URL("../src/app/admin/analyze/worldCountries.json", import.meta.url);
const countryCodeAliases = new Map([["CN-TW", "TW"]]);

function normalizeCountryCode(code) {
  if (code === "-99") return null;
  const normalized = countryCodeAliases.get(code) ?? code;
  if (typeof normalized !== "string" || !/^[A-Z]{2}$/.test(normalized)) {
    throw new Error(`Unsupported country code: ${code}`);
  }
  return normalized;
}

function simplify(points, tolerance = 0.15) {
  if (points.length < 3) return points;
  const a = points[0];
  const b = points[points.length - 1];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = dx * dx + dy * dy;
  const distance = (point) => {
    const t = length ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length)) : 0;
    return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
  };
  let index = 1;
  let maximum = distance(points[index]);
  for (let candidate = 2; candidate < points.length - 1; candidate++) {
    const value = distance(points[candidate]);
    if (value > maximum) {
      maximum = value;
      index = candidate;
    }
  }
  if (maximum <= tolerance) return [a, b];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

function roundCoordinate(value) {
  // Preserve Python's ties-to-even rounding at exact binary midpoints (e.g. 1.125).
  const scaled = value * 100;
  return Number.isInteger(value * 8) && Math.abs(scaled % 1) === 0.5
    ? Math.round(scaled / 2) * 2 / 100
    : Number(value.toFixed(2));
}

export function buildCountryShapes(data) {
  return data.features.map(({ geometry, properties }) => {
    if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
      throw new Error(`Unsupported country geometry: ${geometry.type}`);
    }
    const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
    // Only exterior rings are bundled, matching the existing map data.
    const rings = polygons.map((polygon) => simplify(polygon[0]))
      .filter((ring) => ring.length >= 4)
      .map((ring) => ring.map(([longitude, latitude]) => [roundCoordinate(longitude), roundCoordinate(latitude)]));
    return { code: normalizeCountryCode(properties["ISO3166-1-Alpha-2"]), name: properties.name, rings };
  });
}

if (import.meta.main) {
  const response = await fetch(source, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Map source request failed: ${response.status}`);
  const countries = buildCountryShapes(await response.json());
  await writeFile(output, `${JSON.stringify(countries)}\n`, "utf8");
  console.log(`Generated ${countries.length} country/territory shapes: ${fileURLToPath(output)}`);
}
