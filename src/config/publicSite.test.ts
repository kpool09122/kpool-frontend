import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicSiteOrigin } from "./publicSite";
afterEach(() => vi.unstubAllEnvs());
describe("public production origin", () => {
  it("defaults to production and normalizes a configured HTTPS origin", () => {
    delete process.env.KPOOL_PUBLIC_SITE_URL;
    expect(getPublicSiteOrigin()).toBe("https://k-pool.app");
    vi.stubEnv("KPOOL_PUBLIC_SITE_URL", "https://public.example.test/");
    expect(getPublicSiteOrigin()).toBe("https://public.example.test");
  });
  it.each([
    "",
    "invalid",
    "http://k-pool.app",
    "javascript:alert(1)",
    "https://user:pass@k-pool.app",
    "https://k-pool.app/subpath",
    "https://k-pool.app/?query=1",
    "https://k-pool.app/#fragment",
  ])("fails closed for unsafe or ambiguous origin %s", (origin) => {
    vi.stubEnv("KPOOL_PUBLIC_SITE_URL", origin);
    expect(getPublicSiteOrigin()).toBeNull();
  });
});
