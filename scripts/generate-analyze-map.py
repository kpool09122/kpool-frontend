"""Generate bundled geographic country rings; no browser network or runtime dependency.
Source: datasets/geo-countries (Natural Earth), public domain.
https://www.naturalearthdata.com/about/terms-of-use/
Run: python3 scripts/generate-analyze-map.py
Boundaries are illustrative, not a statement about sovereignty.
"""
import json
import math
import pathlib
import re
import urllib.request

SOURCE = "https://raw.githubusercontent.com/datasets/geo-countries/ca3b7150caa5d3cc3fb108a87fc6e3d57bd97d99/data/countries.geojson"


# Align source-specific identifiers with the country codes used by the report APIs.
COUNTRY_CODE_ALIASES = {"CN-TW": "TW"}


def normalize_country_code(code):
    if code == "-99":
        return None
    normalized = COUNTRY_CODE_ALIASES.get(code, code)
    if not re.fullmatch(r"[A-Z]{2}", normalized):
        raise ValueError(f"Unsupported country code: {code}")
    return normalized


def simplify(points, tolerance=0.15):
    if len(points) < 3:
        return points
    a, b = points[0], points[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = dx * dx + dy * dy
    def distance(p):
        t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) if length else 0
        return math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
    index = max(range(1, len(points) - 1), key=lambda i: distance(points[i]))
    if distance(points[index]) <= tolerance:
        return [a, b]
    return simplify(points[:index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)


def main():
    with urllib.request.urlopen(SOURCE) as response:
        data = json.load(response)
    countries = []
    for feature in data["features"]:
        geometry = feature["geometry"]
        polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        rings = []
        for polygon in polygons:
            # Outer rings only; tiny islands remain accessible in the country selector.
            ring = simplify(polygon[0])
            if len(ring) < 4:
                continue
            rings.append([[round(p[0], 2), round(p[1], 2)] for p in ring])
        code = feature["properties"]["ISO3166-1-Alpha-2"]
        countries.append({"code": normalize_country_code(code), "name": feature["properties"]["name"], "rings": rings})
    output = pathlib.Path(__file__).resolve().parents[1] / "src/app/admin/analyze/worldCountries.json"
    output.write_text(json.dumps(countries, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"Generated {len(countries)} country/territory shapes: {output}")


if __name__ == "__main__":
    main()
