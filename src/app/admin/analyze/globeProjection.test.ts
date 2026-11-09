import { describe, expect, it } from "vitest";
import countries from "./worldCountries.json";
import { isCountryCodeOption } from "@/utils/countryOptions";
import { dragGlobe, getInitialGlobeRotation, initialGlobeRotation, projectGlobe } from "./globeProjection";

describe("globe projection", () => {
  it("uses supported API country codes and projects Taiwan separately from China", () => {
    expect(countries.every((country) => country.code === null || isCountryCodeOption(country.code))).toBe(true);
    const globe = projectGlobe(getInitialGlobeRotation("TW"));
    const taiwan = globe.countries.find((country) => country.code === "TW");
    const china = globe.countries.find((country) => country.code === "CN");
    expect(taiwan?.name).toBe("Taiwan");
    expect(taiwan?.path).toBeTruthy();
    expect(china?.path).toBeTruthy();
    expect(taiwan?.path).not.toBe(china?.path);
    expect(globe.countries.some((country) => country.code === "CN-TW")).toBe(false);
  });
  it("clips the back of the globe as it rotates", () => {
    const asia = projectGlobe(initialGlobeRotation);
    expect(asia.countries.some((country) => country.code === "JP")).toBe(true);
    expect(asia.countries.some((country) => country.code === "BR")).toBe(false);
    const americas = projectGlobe([55, 10]);
    expect(americas.countries.some((country) => country.code === "BR")).toBe(true);
    expect(americas.countries.some((country) => country.code === "JP")).toBe(false);
    expect(americas.countries.every((country) => !country.path.includes("NaN"))).toBe(true);
  });
  it("centers the visitor country and falls back when it cannot be located", () => {
    const rotation = getInitialGlobeRotation("BR");
    const globe = projectGlobe(rotation);
    expect(globe.countries.some((country) => country.code === "BR")).toBe(true);
    expect(globe.countries.some((country) => country.code === "JP")).toBe(false);
    expect(getInitialGlobeRotation(null)).toEqual(initialGlobeRotation);
    expect(getInitialGlobeRotation("XX")).toEqual(initialGlobeRotation);
  });
  it("rotates across the date line and limits the tilt at the poles", () => {
    expect(dragGlobe([175, 0], 20, 0, 1)).toEqual([-165, 0]);
    expect(dragGlobe([-175, 0], -20, 0, 1)).toEqual([165, 0]);
    expect(dragGlobe([0, 0], 0, 1000, 1)).toEqual([0, -85]);
    expect(dragGlobe([0, 0], 0, -1000, 1)).toEqual([0, 85]);
  });
});
