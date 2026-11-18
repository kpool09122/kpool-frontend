import { afterEach, expect, it, vi } from "vitest";
import { oauthConnectionsBrowserApi as api } from "./oauthConnectionsBrowserApi";
afterEach(() => vi.unstubAllGlobals());
it("loads the server defaults and allows saving no scopes using PUT and cookies", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ scopes: ["wiki:read"] }))
    .mockResolvedValueOnce(Response.json([]));
  vi.stubGlobal("fetch", fetchMock);
  expect(await api.settings("ja")).toEqual({
    ok: true,
    data: { scopes: ["wiki:read"] },
  });
  expect((await api.save([], "ja")).ok).toBe(true);
  expect(fetchMock.mock.calls.at(-1)).toMatchObject([
    "/api/identity/oauth/scope-settings",
    { method: "PUT", credentials: "include", body: '{"scopes":[]}' },
  ]);
});

it("uses connection ID, strips credentials from successful list data, and includes CSRF", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        connections: [
          {
            connectionIdentifier: id,
            clientIdentifier: id,
            clientName: "App",
            scopes: [],
            createdAt: "2026-11-01T00:00:00Z",
            revokedAt: null,
            accessToken: "secret",
          },
        ],
        refreshToken: "secret",
      }),
    )
    .mockResolvedValueOnce(Response.json([]));
  vi.stubGlobal("fetch", fetchMock);
  expect(JSON.stringify(await api.list("ko"))).not.toContain("secret");
  expect((await api.revoke(id, "ko")).ok).toBe(true);
  expect(fetchMock.mock.calls.at(-1)).toMatchObject([
    `/api/identity/oauth/connections/${id}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: { "Accept-Language": "ko", "X-XSRF-TOKEN": "test-csrf-token" },
    },
  ]);
});
it.each([401, 403, 404, 419, 422, 500])(
  "returns status %i for localized UI recovery",
  async (status) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ message: "Failed" }, { status })),
    );
    expect(await api.save([])).toMatchObject({ ok: false, status });
  },
);
it("fails closed on malformed schemas and transport failures without logging payloads", async () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ accessToken: "secret" })),
  );
  expect((await api.list()).ok).toBe(false);
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private host")));
  expect(await api.settings()).toMatchObject({ ok: false, status: 0 });
});
