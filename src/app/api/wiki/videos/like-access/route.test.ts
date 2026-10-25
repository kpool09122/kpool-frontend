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
  principalIdentifier: "wiki-me",
  identityIdentifier: "identity",
  status: "active",
  policies: [
    {
      statements: [
        {
          effect: "allow",
          actions: ["like_video_link", "unlike_video_link"],
          resourceTypes: ["group"],
        },
      ],
    },
  ],
};
const run = (resource = "group") =>
  GET(
    new NextRequest(
      `http://localhost/api/wiki/videos/like-access?resourceType=${resource}`,
      { headers: { Cookie: "session=x" } },
    ),
  );
afterEach(() => vi.resetAllMocks());
it("evaluates dedicated actions independently and honors DENY", async () => {
  mocks.identity.mockResolvedValue(identity);
  mocks.principal.mockResolvedValue({ status: "available", principal });
  const response = await run();
  expect(await response.json()).toEqual({
    canLike: true,
    canUnlike: true,
    principalIdentifier: "wiki-me",
  });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  mocks.principal.mockResolvedValue({
    status: "available",
    principal: {
      ...principal,
      policies: [
        ...principal.policies,
        {
          statements: [
            {
              effect: "deny",
              actions: ["like_video_link"],
              resourceTypes: ["group"],
            },
          ],
        },
      ],
    },
  });
  expect(await (await run()).json()).toEqual({
    canLike: false,
    canUnlike: true,
    principalIdentifier: "wiki-me",
  });
  expect(await (await run("song")).json()).toMatchObject({
    canLike: false,
    canUnlike: false,
  });
  mocks.principal.mockResolvedValue({
    status: "available",
    principal: {
      ...principal,
      policies: [
        {
          statements: [
            {
              effect: "allow",
              actions: ["save_video_links", "delete_video_link"],
              resourceTypes: ["group"],
            },
          ],
        },
      ],
    },
  });
  expect(await (await run()).json()).toMatchObject({
    canLike: false,
    canUnlike: false,
  });
});
it.each([
  null,
  { ...identity, account: { status: "suspended" } },
  { ...identity, accountPrincipalStatus: "suspended" },
])("does not grant unavailable/inactive identities", async (value) => {
  mocks.identity.mockResolvedValue(value);
  expect(await (await run()).json()).toEqual({
    canLike: false,
    canUnlike: false,
    principalIdentifier: null,
  });
  expect(mocks.principal).not.toHaveBeenCalled();
});
it.each([
  { status: "missing" },
  { status: "error" },
  { status: "available", principal: { ...principal, status: "suspended" } },
  {
    status: "available",
    principal: { ...principal, identityIdentifier: "other" },
  },
])("rejects missing, inactive or mismatched Wiki principals", async (state) => {
  mocks.identity.mockResolvedValue(identity);
  mocks.principal.mockResolvedValue(state);
  expect(await (await run()).json()).toEqual({
    canLike: false,
    canUnlike: false,
    principalIdentifier: null,
  });
});
it("reports a transient principal lookup failure for a retry instead of a permanent denial", async () => {
  mocks.identity.mockResolvedValue(identity);
  mocks.principal.mockResolvedValue({ status: "error" });
  expect((await run()).status).toBe(503);
});
it("rejects unsupported resource types", async () => {
  expect(await (await run("image")).json()).toMatchObject({
    canLike: false,
    canUnlike: false,
  });
  expect(mocks.identity).not.toHaveBeenCalled();
});
