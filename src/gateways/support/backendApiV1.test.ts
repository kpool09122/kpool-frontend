import { describe, expect, it, vi, afterEach } from "vitest";
import { withIdentityApiPrefix, getIdentityApiBaseUrl } from "@/gateways/identity/identityApi";
import { withAccountApiPrefix, getAccountApiBaseUrl } from "@/gateways/account/accountApi";
import { withSiteManagementApiPrefix, getSiteManagementApiBaseUrl } from "@/gateways/contact/contactApi";
import { withWikiApiPrefix } from "@kpool/wiki";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";

const contexts = [
  { context: "identity", build: withIdentityApiPrefix },
  { context: "account", build: withAccountApiPrefix },
  { context: "site-management", build: withSiteManagementApiPrefix },
  { context: "wiki", build: withWikiApiPrefix },
];

afterEach(() => vi.unstubAllEnvs());

describe.each(contexts)("backend v1 $context URL", ({ context, build }) => {
  it.each(["", "/", "///"])("adds v1 to an origin with trailing slash %s", (suffix) => {
    expect(build(`https://backend.example.test${suffix}`)).toBe(`https://backend.example.test/api/v1/${context}`);
  });
  it.each(["", "/", "///"])("does not duplicate a complete v1 prefix %s", (suffix) => {
    expect(build(`https://backend.example.test/api/v1/${context}${suffix}`)).toBe(`https://backend.example.test/api/v1/${context}`);
  });
  it.each(["", "/"])("normalizes a configured legacy prefix without contacting old endpoints %s", (suffix) => {
    expect(build(`https://backend.example.test/api/${context}${suffix}`)).toBe(`https://backend.example.test/api/v1/${context}`);
  });
});

describe("server runtime backend configuration", () => {
  it("resolves all four contexts using server environment only", () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example.test/api/v1/wiki/");
    expect(getWikiPrivateApiBaseUrl()).toBe("https://backend.example.test/api/v1/wiki");
    expect(getIdentityApiBaseUrl({ KPOOL_IDENTITY_API_BASE_URL: "https://backend.example.test/" })).toBe("https://backend.example.test/api/v1/identity");
    expect(getAccountApiBaseUrl({ KPOOL_ACCOUNT_API_BASE_URL: "https://backend.example.test/" })).toBe("https://backend.example.test/api/v1/account");
    expect(getSiteManagementApiBaseUrl({ KPOOL_SITE_MANAGEMENT_API_BASE_URL: "https://backend.example.test/" })).toBe("https://backend.example.test/api/v1/site-management");
  });
  it("keeps unconfigured backend behavior", () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "");
    expect(getWikiPrivateApiBaseUrl()).toBe("");
    expect(getIdentityApiBaseUrl({})).toBeNull();
    expect(getAccountApiBaseUrl({})).toBeNull();
    expect(getSiteManagementApiBaseUrl({})).toBeNull();
  });
});
