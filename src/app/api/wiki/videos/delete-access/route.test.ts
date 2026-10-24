import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
const mocks = vi.hoisted(() => ({ identity: vi.fn(), principal: vi.fn() }));
vi.mock("@/gateways/identity/authIdentity", () => ({
  fetchAuthenticatedIdentity: mocks.identity,
}));
vi.mock("@/gateways/wiki/wikiPrincipal", async (original) => ({
  ...(await original<typeof import("@/gateways/wiki/wikiPrincipal")>()),
  getCurrentWikiPrincipalForRequest: mocks.principal,
}));
const identity = {
  identityIdentifier: "identity",
  account: { status: "active" },
  accountPrincipalStatus: "active",
};
const principal = {
  principalIdentifier: "wiki-principal",
  identityIdentifier: "identity",
  status: "active",
  policies: [
    {
      statements: [
        {
          effect: "allow",
          actions: ["delete_video_link"],
          resourceTypes: ["group"],
        },
      ],
    },
  ],
};
const run = (resource = "group") =>
  GET(
    new NextRequest(
      `http://localhost/api/wiki/videos/delete-access?resourceType=${resource}`,
      { headers: { Cookie: "session=x" } },
    ),
  );
afterEach(() => vi.resetAllMocks());
it("returns authenticated Wiki principal, not Account principal, and resource-specific permission", async () => {
  mocks.identity.mockResolvedValue(identity);
  mocks.principal.mockResolvedValue({ status: "available", principal });
  const response = await run();
  expect(await response.json()).toEqual({
    canDelete: true,
    principalIdentifier: "wiki-principal",
  });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await (await run("song")).json()).toEqual({
    canDelete: false,
    principalIdentifier: null,
  });
});
it.each([
  null,
  { ...identity, account: { status: "suspended" } },
  { ...identity, accountPrincipalStatus: "suspended" },
])("fails closed for unavailable identity/account (%o)", async (value) => {
  mocks.identity.mockResolvedValue(value);
  expect(await (await run()).json()).toEqual({
    canDelete: false,
    principalIdentifier: null,
  });
  expect(mocks.principal).not.toHaveBeenCalled();
});
it.each([
  { status: "missing" },
  { status: "error" },
  {
    status: "available",
    principal: { ...principal, identityIdentifier: "other" },
  },
  { status: "available", principal: { ...principal, policies: [] } },
])(
  "fails closed for unknown, mismatched or denied principal",
  async (state) => {
    mocks.identity.mockResolvedValue(identity);
    mocks.principal.mockResolvedValue(state);
    expect(await (await run()).json()).toEqual({
      canDelete: false,
      principalIdentifier: null,
    });
  },
);
it("rejects unsupported resource before I/O", async () => {
  expect(await (await run("image")).json()).toEqual({
    canDelete: false,
    principalIdentifier: null,
  });
  expect(mocks.identity).not.toHaveBeenCalled();
});
