import { describe, expect, it } from "vitest";
import { analyzeConditionsUrl, readAnalyzeConditions, analyzeLocationUrl, readAnalyzeLocation, type AnalyzeConditions } from "./analyzeConditions";

const fallback: AnalyzeConditions = { from: "2026-01-01", to: "2026-01-28", translationSetIdentifier: "", wikiName: "", language: "" };
const now = new Date("2026-11-10T00:00:00Z");
const id = "11111111-1111-4111-8111-111111111111";

describe("shareable analysis conditions", () => {
  it("round-trips selected UTC calendar dates, Wiki and language while preserving other query parameters and the hash", () => {
    const conditions = { ...fallback, translationSetIdentifier: id, wikiName: "分析サンプル & Stage", language: "ko" };
    const path = analyzeConditionsUrl("https://front.test/admin/analyze?test=true#reports", conditions);
    const url = new URL(path, "https://front.test");
    expect(url.pathname).toBe("/admin/analyze");
    expect(url.searchParams.get("test")).toBe("true");
    expect(url.hash).toBe("#reports");
    expect(readAnalyzeConditions(url.search, fallback, now)).toMatchObject({ conditions, requestedConditions: conditions, invalid: false, error: null });
  });

  it.each([
    "from=invalid", "from=2026-02-30", "from=2026-01-01&to=2026-07-02",
    "translationSetIdentifier=invalid", "language=invalid", "to=2026-11-10",
  ])("rejects unsafe/invalid query conditions: %s", (query) => {
    expect(readAnalyzeConditions(query, fallback, now)).toMatchObject({ conditions: fallback, invalid: true });
  });

  it("restores a Wiki ID even when no display name is present", () => {
    expect(readAnalyzeConditions(`translationSetIdentifier=${id}`, fallback, now).conditions.translationSetIdentifier).toBe(id);
    expect(readAnalyzeConditions("wikiName=unselected", fallback, now).conditions.wikiName).toBe("");
  });

  it("removes cleared filters instead of keeping an old Wiki selection", () => {
    const path = analyzeConditionsUrl(`https://front.test/admin/analyze?test=true&translationSetIdentifier=${id}&wikiName=TWICE&language=ko`, fallback);
    const params = new URL(path, "https://front.test").searchParams;
    expect(params.has("translationSetIdentifier")).toBe(false);
    expect(params.has("wikiName")).toBe(false);
    expect(params.has("language")).toBe(false);
    expect(params.get("test")).toBe("true");
  });
});


describe("shareable geography", () => {
  it("restores a pinned country and a selected subdivision", () => {
    expect(readAnalyzeLocation("country=JP")).toEqual({ country: "JP", region: undefined, domestic: false, invalid: false });
    expect(readAnalyzeLocation("country=JP&region=JP-13")).toEqual({ country: "JP", region: "JP-13", domestic: true, invalid: false });
    expect(readAnalyzeLocation("country=PH&region=PH-40&view=regional").domestic).toBe(true);
    expect(readAnalyzeLocation("country=JP&view=regional")).toMatchObject({ domestic: true, region: undefined, invalid: false });
  });

  it("distinguishes unknown countries/regions from an unfiltered view", () => {
    expect(readAnalyzeLocation("").country).toBeUndefined();
    expect(readAnalyzeLocation("country=unknown")).toMatchObject({ country: null, domestic: false, invalid: false });
    expect(readAnalyzeLocation("country=JP&region=unknown")).toMatchObject({ country: "JP", region: null, domestic: true, invalid: false });
  });

  it.each([
    "country=ZZ", "country=JP&region=US-CA", "country=JP&region=JP-999",
    "country=CN&region=CN-71", "region=JP-13", "country=unknown&region=unknown",
    "country=DE&view=regional", "country=JP&view=invalid",
  ])("does not restore invalid or unsupported subdivisions: %s", (query) => {
    const location = readAnalyzeLocation(query);
    expect(location.invalid).toBe(true);
    expect(location.domestic).toBe(false);
    expect(location.region).toBeUndefined();
  });

  it("round-trips geography and removes stale subdivisions on return/reset", () => {
    const base = "https://front.test/admin/analyze?test=true&from=2026-01-01#reports";
    const selected = analyzeLocationUrl(base, { country: "JP", region: "JP-13", domestic: true });
    const url = new URL(selected, base);
    expect(url.searchParams.get("test")).toBe("true");
    expect(url.searchParams.get("from")).toBe("2026-01-01");
    expect(url.hash).toBe("#reports");
    expect(readAnalyzeLocation(url.search)).toMatchObject({ country: "JP", region: "JP-13", domestic: true, invalid: false });
    const globe = new URL(analyzeLocationUrl(url.href, { country: "JP", domestic: false }), base);
    expect(globe.searchParams.get("country")).toBe("JP");
    expect(globe.searchParams.has("region")).toBe(false);
    expect(globe.searchParams.has("view")).toBe(false);
    const reset = new URL(analyzeLocationUrl(url.href, { domestic: false }), base);
    expect(reset.searchParams.has("country")).toBe(false);
    expect(reset.searchParams.get("from")).toBe("2026-01-01");
  });
});
