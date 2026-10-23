import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";
const mocks = vi.hoisted(() => ({ identity: vi.fn(), principal: vi.fn() }));
vi.mock("@/gateways/identity/authIdentity", () => ({
  fetchAuthenticatedIdentity: mocks.identity,
}));
vi.mock("@/gateways/wiki/wikiPrincipal", async (original) => ({
  ...(await original<object>()),
  getCurrentWikiPrincipalForRequest: mocks.principal,
}));
afterEach(() => vi.resetAllMocks());
const request = () =>
  new NextRequest(
    "http://localhost/api/wiki/videos/access?resourceType=group",
    { headers: { Cookie: "session=x" } },
  );
it("fails closed for anonymous/inactive identity without loading principal", async () => {
  for (const identity of [
    null,
    { account: { status: "suspended" } },
    { account: { status: "active" }, accountPrincipalStatus: "suspended" },
  ]) {
    mocks.identity.mockResolvedValue(identity);
    expect(await (await GET(request())).json()).toEqual({ canCreate: false });
  }
  expect(mocks.principal).not.toHaveBeenCalled();
});
it("requires an active Wiki principal with the backend action", async () => {
  mocks.identity.mockResolvedValue({
    account: { status: "active" },
    accountPrincipalStatus: "active",
  });
  mocks.principal.mockResolvedValue({
    status: "available",
    principal: {
      status: "active",
      policies: [
        {
          statements: [
            {
              effect: "allow",
              actions: ["save_video_links"],
              resourceTypes: ["group"],
              condition: null,
            },
          ],
        },
      ],
    },
  });
  const response = await GET(request());
  expect(await response.json()).toEqual({ canCreate: true });
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(mocks.principal).toHaveBeenCalledWith({ cookieHeader: "session=x" });
  mocks.principal.mockResolvedValue({ status: "error", message: "secret" });
  expect(await (await GET(request())).json()).toEqual({ canCreate: false });
});
