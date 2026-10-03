import { afterEach, describe, expect, it, vi } from "vitest";

import { withdrawFromService } from "./withdrawIdentityBrowserApi";

describe("withdrawFromService", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses one DELETE request and preserves the Problem Details code", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "recent_authentication_required",
      message: "Recent authentication is required.",
    }), { status: 401, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await withdrawFromService("Member")).toEqual({
      ok: false,
      code: "recent_authentication_required",
      message: "Recent authentication is required.",
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/identity",
      expect.objectContaining({ method: "DELETE", credentials: "include", cache: "no-store", body: JSON.stringify({ confirmationIdentityName: "Member" }) }),
    );
  });
});
