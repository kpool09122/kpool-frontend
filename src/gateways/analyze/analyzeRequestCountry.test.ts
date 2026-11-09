import { afterEach, describe, expect, it, vi } from "vitest";
import { getAnalyzeRequestCountry } from "./analyzeRequestCountry";

const context = vi.hoisted(() => vi.fn());
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: context }));
afterEach(() => vi.resetAllMocks());

describe("Analyze request country", () => {
  it.each(["JP", "US", "BR"])("reads %s from request-scoped country metadata", (country) => {
    context.mockReturnValue({ cf: { country } });
    expect(getAnalyzeRequestCountry()).toBe(country);
  });
  it.each([undefined, null, "XX", "T1", "unknown", "ZZ"])("returns no country for %s", (country) => {
    context.mockReturnValue({ cf: { country } });
    expect(getAnalyzeRequestCountry()).toBeNull();
  });
  it("works when Cloudflare context is unavailable in local development", () => {
    context.mockImplementation(() => { throw new Error("No Cloudflare context"); });
    expect(getAnalyzeRequestCountry()).toBeNull();
  });
});
