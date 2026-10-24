import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteWikiVideo } from "./wikiVideos";
import { canDeleteWikiVideo } from "./wikiPrincipal";
import { getMockWikiPrincipalState } from "./mockWikiGateway";
import type { WikiPrincipalSummary } from "./wikiPrincipal";

const principal: WikiPrincipalSummary = {
  principalIdentifier: "wiki-principal",
  identityIdentifier: "identity",
  isDelegatedPrincipal: false,
  status: "active",
  accountPrincipalCount: 1,
  policies: [
    {
      policyIdentifier: "policy",
      name: "delete",
      isSystemPolicy: true,
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
afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
});
describe("video deletion", () => {
  it("keeps the collaborator E2E fixture aligned with delete permission", () => {
    vi.stubEnv("KPOOL_ENABLE_MOCK_WIKI_GATEWAY", "1");
    const state = getMockWikiPrincipalState(
      "kpool-e2e-wiki-principal=video-collaborator",
    );
    expect(state?.status).toBe("available");
    if (state?.status === "available")
      expect(canDeleteWikiVideo(state.principal, "group")).toBe(true);
    vi.unstubAllEnvs();
  });
  it("requires delete permission on the target resource, not save permission", () => {
    expect(canDeleteWikiVideo(principal, "group")).toBe(true);
    expect(canDeleteWikiVideo(principal, "song")).toBe(false);
    expect(
      canDeleteWikiVideo({ ...principal, status: "suspended" }, "group"),
    ).toBe(false);
    const policy = principal.policies[0];
    expect(
      canDeleteWikiVideo(
        {
          ...principal,
          policies: [
            {
              ...policy,
              statements: [
                {
                  effect: "allow",
                  actions: ["save_video_links"],
                  resourceTypes: ["group"],
                },
              ],
            },
          ],
        },
        "group",
      ),
    ).toBe(false);
    expect(
      canDeleteWikiVideo(
        {
          ...principal,
          policies: [
            {
              ...policy,
              statements: [
                ...policy.statements,
                { effect: "deny", actions: ["*"], resourceTypes: ["*"] },
              ],
            },
          ],
        },
        "group",
      ),
    ).toBe(false);
  });
  it("evaluates static conditions against the backend's empty resource and fails closed on unknown grants", () => {
    const policy = principal.policies[0];
    const allow = {
      ...policy.statements[0],
      condition: {
        clauses: [
          {
            field: "resource:isOfficial",
            operator: "eq" as const,
            value: false,
          },
        ],
      },
    };
    expect(
      canDeleteWikiVideo(
        { ...principal, policies: [{ ...policy, statements: [allow] }] },
        "group",
      ),
    ).toBe(true);
    const deny = {
      ...allow,
      effect: "deny" as const,
      condition: {
        clauses: [
          {
            field: "resource:isOfficial",
            operator: "eq" as const,
            value: true,
          },
        ],
      },
    };
    expect(
      canDeleteWikiVideo(
        { ...principal, policies: [{ ...policy, statements: [allow, deny] }] },
        "group",
      ),
    ).toBe(true);
    expect(
      canDeleteWikiVideo(
        {
          ...principal,
          policies: [
            {
              ...policy,
              statements: [
                {
                  ...allow,
                  condition: {
                    clauses: [
                      {
                        field: "resource:agencyId",
                        operator: "eq",
                        value: "${principal.agencyId}",
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
        "group",
      ),
    ).toBe(false);
  });
  it("sends authenticated CSRF protected DELETE and accepts bodyless 204", async () => {
    document.cookie = "XSRF-TOKEN=csrf; path=/";
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    expect(
      await deleteWikiVideo("00000000-0000-4000-8000-000000000001"),
    ).toEqual({ ok: true, status: 204 });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/wiki/videos/00000000-0000-4000-8000-000000000001",
      expect.objectContaining({
        method: "DELETE",
        credentials: "include",
        headers: expect.objectContaining({ "X-XSRF-TOKEN": "csrf" }),
      }),
    );
  });
  it.each([200, 401, 403, 404, 422, 500])(
    "does not accept %i as success",
    async (status) => {
      document.cookie = "XSRF-TOKEN=csrf; path=/";
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(Response.json({ message: "secret" }, { status })),
      );
      expect(
        await deleteWikiVideo("00000000-0000-4000-8000-000000000001"),
      ).toEqual({ ok: false, status });
    },
  );
  it("returns a safe transport failure and rejects invalid identifiers before I/O", async () => {
    document.cookie = "XSRF-TOKEN=csrf; path=/";
    const fetcher = vi.fn().mockRejectedValue(new Error("secret"));
    vi.stubGlobal("fetch", fetcher);
    expect(await deleteWikiVideo("../create")).toEqual({
      ok: false,
      status: 422,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      await deleteWikiVideo("00000000-0000-4000-8000-000000000001"),
    ).toEqual({ ok: false, status: 0 });
  });
});
