"""Generate bundled equirectangular country paths; no browser network or runtime dependency.
Source: datasets/geo-countries (Natural Earth), public domain.
https://www.naturalearthdata.com/about/terms-of-use/
Run: python3 scripts/generate-analyze-map.py
Boundaries are illustrative, not a statement about sovereignty.
"""
import json
import math
import pathlib
import urllib.request

SOURCE = "https://raw.githubusercontent.com/datasets/geo-countries/ca3b7150caa5d3cc3fb108a87fc6e3d57bd97d99/data/countries.geojson"


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
    paths = []
    for feature in data["features"]:
        geometry = feature["geometry"]
        polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        commands = []
        for polygon in polygons:
            # Outer rings only; tiny islands remain accessible in the country table.
            ring = simplify(polygon[0])
            if len(ring) < 4:
                continue
            commands.append("M" + "L".join(f"{(p[0]+180)*2:.1f},{(90-p[1])*2:.1f}" for p in ring) + "Z")
        code = feature["properties"]["ISO3166-1-Alpha-2"]
        paths.append({"code": None if code == "-99" else code, "name": feature["properties"]["name"], "path": "".join(commands)})
    output = pathlib.Path(__file__).resolve().parents[1] / "src/app/admin/analyze/worldCountries.json"
    output.write_text(json.dumps(paths, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"Generated {len(paths)} country/territory shapes: {output}")


if __name__ == "__main__":
    main()
