import { geoArea, geoMercator, geoPath } from "d3-geo";
import boundaries from "./regionalBoundaries.json";
import coverage from "./regionalMapCoverage.json";
import { getInitialGlobeRotation } from "./globeProjection";
import { isSelectableRegion } from "./regionalSelection";
export const supportedMapCountry = (country: string) =>
  coverage.codes.some((code) => code.startsWith(`${country}-`));
export const regionBoundary = (code: string) =>
  boundaries.find((shape) => shape.code === code);
export const projectRegions = (country: string, level: string) => {
  const shapes = boundaries
    .filter(
      (shape) =>
        shape.code.startsWith(`${country}-`) &&
        isSelectableRegion(country, shape.code) &&
        (country !== "PH" || shape.level === level),
    )
    .map((shape) => ({
      ...shape,
      geometry: {
        type: "MultiPolygon" as const,
        coordinates: shape.polygons.map((polygon) =>
          polygon.map((ring, index) => {
            const area = geoArea({ type: "Polygon", coordinates: [ring] });
            return (index === 0 ? area > 2 * Math.PI : area < 2 * Math.PI)
              ? ring.toReversed()
              : ring;
          }),
        ),
      },
    }));
  const collection = {
    type: "GeometryCollection" as const,
    geometries: shapes.map((shape) => shape.geometry),
  };
  // Move the projection seam away from this country (Alaska and NZ cross ±180°).
  const projection = geoMercator()
    .rotate([getInitialGlobeRotation(country)[0], 0])
    .fitExtent(
      [
        [10, 10],
        [690, 450],
      ],
      collection,
    );
  const path = geoPath(projection);
  return shapes.map((shape) => ({
    code: shape.code,
    name: shape.name,
    path: path(shape.geometry) ?? "",
    bounds: path.bounds(shape.geometry),
  }));
};
