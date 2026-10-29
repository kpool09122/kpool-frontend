import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { parseAuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
vi.mock("@/gateways/identity/identityApi", () => ({
  getIdentityApiBaseUrl: () => "https://identity.example/api/v1/identity",
  parseAuthenticatedIdentitySummary: vi.fn((body) => body),
}));
const id = "00000000-0000-4000-8000-000000000001";
const wiki = {
  wikiIdentifier: id,
  translationSetIdentifier: id,
  slug: "ta-owner",
  language: "ja",
  resourceType: "talent",
  version: 1,
  themeColor: null,
  fontStyle: null,
  title: null,
  metaDescription: null,
  keywords: null,
  imageIdentifier: null,
  imageUrl: null,
  imageAltText: null,
  isHidden: null,
  name: "Owner",
  normalizedName: "owner",
  publishedAt: "2026-10-29T00:00:00Z",
  updatedAt: null,
};
const identity = {
  delegationIdentifier: null,
  accountIdentifier: id,
  accountPrincipalStatus: "active",
  account: { status: "active" },
};
const owned = {
  accountCategory: "talent",
  primaryOwnedWikis: [wiki],
  otherOwnedWikis: [],
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 100,
};
const fetcher = vi.fn();
const request = (query = "", cookie = true) =>
  new NextRequest(
    `https://frontend.example/api/wiki/my/watch-request-videos${query}`,
    {
      headers: {
        ...(cookie ? { Cookie: "session=owner" } : {}),
        "Accept-Language": "ja",
      },
    },
  );
beforeEach(() => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  vi.stubGlobal("fetch", fetcher);
  fetcher.mockReset();
  vi.mocked(parseAuthenticatedIdentitySummary).mockImplementation(
    (body) => body as ReturnType<typeof parseAuthenticatedIdentitySummary>,
  );
  fetcher.mockImplementation(async (url: string) =>
    Response.json(
      url.includes("/auth/me")
        ? identity
        : url.includes("/my/owned-wikis")
          ? owned
          : { videos: [] },
    ),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("returns only the authenticated owner's published talent wikis", async () => {
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    wikis: [
      {
        wikiIdentifier: id,
        name: "Owner",
        language: "ja",
        slug: "ta-owner",
        resourceType: "talent",
      },
    ],
  });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("requests only the exact owned wiki with fixed recent-request ranking", async () => {
  const response = await GET(
    request(`?wikiIdentifier=${id}&sortByWatchRequests=false`),
  );
  expect(response.status).toBe(200);
  expect(fetcher.mock.calls.at(-1)?.[0]).toBe(
    "https://backend.example/api/v1/wiki/wiki/ja/talent/ta-owner/videos?recentWatchRequestsOnly=true&sortByWatchRequests=true",
  );
  expect(fetcher.mock.calls[1][1].headers).toMatchObject({
    Cookie: "session=owner",
    "Accept-Language": "ja",
  });
});
it("rejects a different owner's identifier before fetching videos", async () => {
  expect(
    (await GET(request("?wikiIdentifier=00000000-0000-4000-8000-000000000002")))
      .status,
  ).toBe(403);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("rejects missing cookies without network calls", async () => {
  expect((await GET(request("", false))).status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});
it("rejects delegation even when the effective account owns the wiki", async () => {
  fetcher.mockResolvedValueOnce(
    Response.json({ ...identity, delegationIdentifier: id }),
  );
  expect((await GET(request())).status).toBe(403);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each([401, 403, 500])(
  "masks upstream %s errors and preserves rotated cookies",
  async (status) => {
    fetcher.mockResolvedValueOnce(
      Response.json(
        { exception: "secret", message: "secret" },
        { status, headers: { "Set-Cookie": "session=rotated; HttpOnly" } },
      ),
    );
    const response = await GET(request());
    expect(response.status).toBe(status === 500 ? 502 : status);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
    expect(response.headers.getSetCookie()).toContain(
      "session=rotated; HttpOnly",
    );
  },
);
it("rejects malformed wiki identifiers", async () => {
  expect((await GET(request("?wikiIdentifier=bad"))).status).toBe(422);
  expect(fetcher).not.toHaveBeenCalled();
});
it("does not expose unpublished or non-talent owned wikis", async () => {
  fetcher.mockResolvedValueOnce(Response.json(identity)).mockResolvedValueOnce(
    Response.json({
      ...owned,
      primaryOwnedWikis: [
        { ...wiki, publishedAt: null },
        { ...wiki, resourceType: "group" },
      ],
    }),
  );
  expect(await (await GET(request())).json()).toEqual({ wikis: [] });
});
it("uses rotated authentication cookies for subsequent owner reads", async () => {
  fetcher.mockResolvedValueOnce(
    Response.json(identity, {
      headers: { "Set-Cookie": "session=rotated; HttpOnly" },
    }),
  );
  expect((await GET(request())).status).toBe(200);
  expect(fetcher.mock.calls[0][1].headers.Cookie).toBe("session=owner");
  expect(fetcher.mock.calls[1][1].headers.Cookie).toBe("session=rotated");
});
it.each(["suspended", "forced_stop"])(
  "rejects inactive owner principals: %s",
  async (status) => {
    fetcher.mockResolvedValueOnce(
      Response.json({ ...identity, accountPrincipalStatus: status }),
    );
    expect((await GET(request())).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
it("does not forward identity credentials to public video reads", async () => {
  await GET(request(`?wikiIdentifier=${id}`));
  expect(fetcher.mock.calls[2][1]).toMatchObject({
    headers: { Accept: "application/json" },
    credentials: "omit",
    cache: "no-store",
  });
});
it.each(["invalid-json", "invalid-schema", "network"])(
  "fails closed on video response %s",
  async (scenario) => {
    fetcher
      .mockResolvedValueOnce(Response.json(identity))
      .mockResolvedValueOnce(Response.json(owned));
    if (scenario === "network")
      fetcher.mockRejectedValueOnce(new Error("secret"));
    else
      fetcher.mockResolvedValueOnce(
        scenario === "invalid-json"
          ? new Response("bad")
          : Response.json({ videos: [{}] }),
      );
    const response = await GET(request(`?wikiIdentifier=${id}`));
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  },
);
it("preserves cookies on schema errors", async () => {
  fetcher
    .mockResolvedValueOnce(
      Response.json(identity, { headers: { "Set-Cookie": "one=1" } }),
    )
    .mockResolvedValueOnce(
      Response.json({ bad: true }, { headers: { "Set-Cookie": "two=2" } }),
    );
  const response = await GET(request());
  expect(response.status).toBe(502);
  expect(response.headers.getSetCookie()).toEqual(["one=1", "two=2"]);
});
