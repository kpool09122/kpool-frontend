import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH as account } from "./account/principal-groups/members/route";
import { PATCH as wiki } from "./wiki/principal-groups/members/route";
import { PATCH as site } from "./site-management/principal-groups/members/route";
const group = "11111111-1111-4111-8111-111111111111";
const user = "22222222-2222-4222-8222-222222222222";
const body = {
  principalGroups: [
    { principalGroupIdentifier: group, principalIdentifiers: [user] },
  ],
  principalStatuses: [{ principalIdentifier: user, status: "forced_stop" }],
};
beforeEach(() => {
  vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://backend.test");
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.test");
  vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "https://backend.test");
});
describe.each([
  ["account", account],
  ["wiki", wiki],
  ["site-management", site],
] as const)("%s atomic save boundary", (context, handler) => {
  it("forwards both changes and preserves commitment/cookies if success response is invalid", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("{}", {
        status: 200,
        headers: { "Set-Cookie": "session=rotated; HttpOnly" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const response = await handler(
      new NextRequest(
        `https://app.test/api/${context}/principal-groups/members`,
        {
          method: "PATCH",
          headers: { Cookie: "session=old", "X-XSRF-TOKEN": "csrf" },
          body: JSON.stringify(body),
        },
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      committed: true,
      refresh: { ok: false },
    });
    expect(response.headers.get("set-cookie")).toContain("session=rotated");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(body);
  });
  it("does not expose backend exception fields or internal server messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            message: "SQL secret",
            exception: "InternalException",
            trace: ["token=secret"],
          },
          { status: 500 },
        ),
      ),
    );
    const response = await handler(
      new NextRequest(
        `https://app.test/api/${context}/principal-groups/members`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(
      /SQL secret|InternalException|token=secret|trace/,
    );
  });
  it.each(["last_active_manager", "principal_status_change_forbidden"])(
    "preserves %s and never refetches after rejected transaction",
    async (code) => {
      const fetcher = vi
        .fn()
        .mockResolvedValue(
          Response.json({ code, detail: "拒否" }, { status: 409 }),
        );
      vi.stubGlobal("fetch", fetcher);
      const response = await handler(
        new NextRequest(
          `https://app.test/api/${context}/principal-groups/members`,
          { method: "PATCH", body: JSON.stringify(body) },
        ),
      );
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ code });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
});
