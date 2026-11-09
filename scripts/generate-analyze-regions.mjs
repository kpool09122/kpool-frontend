/**
 * Rebuild: node scripts/generate-analyze-regions.mjs [backend-checkout]
 * Coverage is extracted from AdministrativeAreaCode at the pinned backend commit,
 * never an API validation allowlist. Natural Earth admin-1 (public domain):
 * https://www.naturalearthdata.com/about/terms-of-use/ ; generalized boundaries.
 * Supplemental OSM boundaries/versions and attribution: analyze-region-supplement.json.
 * The combined derivative database is ODbL 1.0; see https://opendatacommons.org/licenses/odbl/1-0/ .
 * Changes: ISO aliases, grouping multipart administrative units, simplification,
 * precision reduction. Boundaries illustrate the backend contract, not sovereignty.
 */
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const backendRef = "fa74beca7bf1f8c0174774b3c0673c7a28f1e819";
const source =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_10m_admin_1_states_provinces.geojson";
const backendPath = "src/Shared/Domain/ValueObject/AdministrativeAreaCode.php";
const cnAliases = Object.fromEntries(
  "BJ:11 TJ:12 HE:13 SX:14 NM:15 LN:21 JL:22 HL:23 SH:31 JS:32 ZJ:33 AH:34 FJ:35 JX:36 SD:37 HA:41 HB:42 HN:43 GD:44 GX:45 HI:46 CQ:50 SC:51 GZ:52 YN:53 XZ:54 SN:61 GS:62 QH:63 NX:64 XJ:65"
    .split(" ")
    .map((x) => x.split(":")),
);
const fail = (message) => {
  console.error(message);
  process.exit(1);
};
const fetchJson = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) fail(`Source failed ${response.status}: ${url}`);
  return response.json();
};
function simplify(points, tolerance = 0.012) {
  if (points.length < 4) return points;
  const a = points[0],
    b = points.at(-1),
    dx = b[0] - a[0],
    dy = b[1] - a[1],
    length = dx * dx + dy * dy;
  let index = 0,
    maximum = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const t = length
      ? Math.max(
          0,
          Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length),
        )
      : 0;
    const distance = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    if (distance > maximum) {
      maximum = distance;
      index = i;
    }
  }
  return maximum <= tolerance
    ? [a, b]
    : [
        ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
        ...simplify(points.slice(index), tolerance),
      ];
}
const polygonsOf = (geometry) =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
const cleanRings = (rings) =>
  rings.map((ring) => {
    const reduced = simplify(ring);
    // Keep small offshore islands even when below simplification tolerance.
    return (reduced.length >= 4 ? reduced : ring).map((p) =>
      p.map((v) => Number(v.toFixed(4))),
    );
  });
const php = process.argv[2]
  ? execFileSync(
      "git",
      ["-C", process.argv[2], "show", `${backendRef}:${backendPath}`],
      { encoding: "utf8" },
    )
  : execFileSync(
      "gh",
      [
        "api",
        `repos/kpool09122/kpool-backend/contents/${backendPath}?ref=${backendRef}`,
        "--jq",
        ".content",
      ],
      { encoding: "utf8" },
    );
const phpText = process.argv[2]
  ? php
  : Buffer.from(php.replace(/\s/g, ""), "base64").toString();
const codes = [...phpText.matchAll(/case \w+ = '([^']+)'/g)].map(
  (match) => match[1],
);
if (!codes.length || new Set(codes).size !== codes.length)
  fail("Invalid backend coverage");
const allowed = new Set(codes),
  shapes = new Map();
const add = (code, name, polygons, level = "area") => {
  if (!allowed.has(code)) return;
  const existing = shapes.get(code);
  if (existing) existing.polygons.push(...polygons);
  else shapes.set(code, { code, name, level, polygons: [...polygons] });
};
const data = process.env.ANALYZE_ADMIN1_SOURCE_FILE
  ? JSON.parse(await readFile(process.env.ANALYZE_ADMIN1_SOURCE_FILE, "utf8"))
  : await fetchJson(source);
for (const feature of data.features) {
  const p = feature.properties,
    polygons = polygonsOf(feature.geometry);
  const code =
    p.iso_a2 === "CN"
      ? `CN-${cnAliases[p.iso_3166_2.slice(3)]}`
      : p.iso_3166_2 === "TW-TPQ"
        ? "TW-NWT"
        : p.iso_3166_2;
  add(code, p.name_en ?? p.name, polygons);
  if (p.iso_a2 === "PH") add(p.region_cod, p.region, polygons, "region");
  if (p.iso_a2 === "TW") add("CN-71", "Taiwan", polygons);
  if (p.iso_a2 === "HK") add("CN-91", "Hong Kong", polygons);
  if (p.iso_a2 === "MO") add("CN-92", "Macao", polygons);
}
const supplement = JSON.parse(
  await readFile(
    new URL("./data/analyze-region-supplement.json", import.meta.url),
    "utf8",
  ),
);
for (const item of supplement.features)
  shapes.set(item.code, {
    code: item.code,
    name: item.name,
    level: "area",
    polygons: polygonsOf(item.geometry),
  });
const missing = codes.filter((code) => !shapes.has(code));
if (missing.length) fail(`Missing boundaries: ${missing.join(", ")}`);
const result = codes.map((code) => ({
  ...shapes.get(code),
  polygons: shapes.get(code).polygons.map(cleanRings),
}));
await writeFile(
  new URL("../src/app/admin/analyze/regionalBoundaries.json", import.meta.url),
  JSON.stringify(result) + "\n",
);
await writeFile(
  new URL("../src/app/admin/analyze/regionalMapCoverage.json", import.meta.url),
  JSON.stringify({ backendRef, backendPath, source, codes }) + "\n",
);
console.log(
  `Generated ${result.length} administrative boundaries in ${new Set(codes.map((code) => code.slice(0, 2))).size} countries`,
);
