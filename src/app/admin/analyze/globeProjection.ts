import { geoArea, geoCentroid, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import countries from "./worldCountries.json";

export type GlobeRotation = [longitude: number, latitude: number];
export const initialGlobeRotation: GlobeRotation = [-135, -20];

// D3 uses clockwise outer rings for polygons smaller than a hemisphere.
const shapes = countries.map((country, index) => ({
  code: country.code,
  name: country.name,
  index,
  geometry: {
    type: "MultiPolygon" as const,
    coordinates: country.rings.map((ring) => [
      geoArea({ type: "Polygon", coordinates: [ring] }) > 2 * Math.PI
        ? ring.toReversed() : ring,
    ]),
  },
}));
const graticule = geoGraticule10();

export const getInitialGlobeRotation = (country: string | null): GlobeRotation => {
  const shape = shapes.find((item) => item.code === country);
  if (!country || !shape) return initialGlobeRotation;
  const [longitude, latitude] = geoCentroid(shape.geometry);
  return Number.isFinite(longitude) && Number.isFinite(latitude)
    ? [-longitude, -latitude] : initialGlobeRotation;
};

export const projectGlobe = (rotation: GlobeRotation) => {
  const projection = geoOrthographic()
    .translate([270, 270])
    .scale(248)
    .rotate(rotation)
    .precision(0.5);
  const path = geoPath(projection);
  return {
    countries: shapes.flatMap((country) => {
      const outline = path(country.geometry);
      return outline ? [{ ...country, path: outline }] : [];
    }),
    graticule: path(graticule) ?? "",
  };
};

export const dragGlobe = (
  start: GlobeRotation,
  dx: number,
  dy: number,
  degreesPerPixel: number,
): GlobeRotation => [
  ((start[0] + dx * degreesPerPixel + 180) % 360 + 360) % 360 - 180,
  Math.max(-85, Math.min(85, start[1] - dy * degreesPerPixel)),
];
