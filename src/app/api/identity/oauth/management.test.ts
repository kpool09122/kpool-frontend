import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { forwardOAuthRoute } from "./routeSupport";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it.each(["PUT", "DELETE"] as const)(
  "requires CSRF for %s before contacting the backend",
  async (method) => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://backend.example");
    const fetchMock = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetchMock);
    const response = await forwardOAuthRoute(
      new NextRequest(
        "https://frontend.example/api/identity/oauth/scope-settings",
        { method, headers: { cookie: "session=secret" } },
      ),
      {
        method,
        path: "/oauth/scope-settings",
        responseSchema: z.array(z.unknown()).length(0),
      },
    );
    expect(response.status).toBe(419);
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

import { GET as list } from "./connections/route";
import { DELETE as revoke } from "./connections/[connectionIdentifier]/route";
import { GET as settings, PUT as save } from "./scope-settings/route";
const id = "11111111-1111-4111-8111-111111111111";
const request = (
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  new NextRequest(
    "https://frontend.example/api/identity/oauth/scope-settings",
    {
      method,
      headers: {
        cookie: "session=private",
        "X-XSRF-TOKEN": "csrf",
        "Accept-Language": "ko",
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
const context = { params: Promise.resolve({ connectionIdentifier: id }) };
const actions = [
  {
    name: "list",
    method: "GET",
    path: "/connections",
    run: () => list(request("GET")),
    response: { connections: [] },
  },
  {
    name: "settings",
    method: "GET",
    path: "/scope-settings",
    run: () => settings(request("GET")),
    response: { scopes: ["wiki:read"] },
  },
  {
    name: "save",
    method: "PUT",
    path: "/scope-settings",
    run: () =>
      save(request("PUT", { scopes: [], identityIdentifier: "foreign" })),
    response: [],
  },
  {
    name: "revoke",
    method: "DELETE",
    path: `/connections/${id}`,
    run: () => revoke(request("DELETE"), context),
    response: [],
  },
];
it.each(actions)(
  "forwards $name contract, cookie, language and rotated cookies",
  async ({ method, path, run, response }) => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://backend.example");
    const mock = vi
      .fn()
      .mockResolvedValue(
        Response.json(response, {
          headers: { "set-cookie": "session=rotated" },
        }),
      );
    vi.stubGlobal("fetch", mock);
    const result = await run();
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual(response);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(result.headers.get("set-cookie")).toContain("rotated");
    expect(mock.mock.calls[0]).toMatchObject([
      `https://backend.example/api/v1/identity/oauth${path}`,
      {
        method,
        cache: "no-store",
        redirect: "manual",
        headers: { Cookie: "session=private", "Accept-Language": "ko" },
      },
    ]);
    if (method === "PUT")
      expect(JSON.parse(mock.mock.calls[0][1].body)).toEqual({ scopes: [] });
    if (method === "DELETE") expect(mock.mock.calls[0][1].body).toBeUndefined();
  },
);
it.each([
  { scopes: [] },
  { scopes: ["wiki:read", "wiki:read"] },
  { scopes: ["unknown"] },
])(
  "validates settings without blocking empty selections: $scopes",
  async ({ scopes }) => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://backend.example");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([])));
    expect((await save(request("PUT", { scopes }))).status).toBe(
      Array.isArray(scopes) && scopes.length === 0 ? 200 : 422,
    );
  },
);
it.each(actions)(
  "masks errors and malformed success on $name while preserving cookies",
  async ({ run }) => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://backend.example");
    for (const status of [401, 403, 404, 419, 422, 429, 500, 503, 200]) {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json(
              {
                message: "private SQL",
                accessToken: "secret",
                trace: "private",
              },
              { status, headers: { "set-cookie": "session=rotated" } },
            ),
          ),
      );
      const result = await run();
      expect(result.status).toBe(status === 200 ? 502 : status);
      expect(await result.text()).not.toMatch(/private|secret|trace|SQL/);
      expect(result.headers.get("set-cookie")).toContain("rotated");
    }
  },
);
it("strips unknown connection fields, including tokens, at both response levels", async () => {
  vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://backend.example");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          accessToken: "secret",
          connections: [
            {
              connectionIdentifier: id,
              clientIdentifier: id,
              clientName: "ChatGPT",
              scopes: ["wiki:read"],
              createdAt: "2026-11-01T00:00:00Z",
              revokedAt: null,
              refreshToken: "secret",
            },
          ],
        }),
      ),
  );
  expect(await (await list(request("GET"))).text()).not.toMatch(/secret|Token/);
});
it.each(["PUT", "DELETE"])(
  "rejects cross-site %s and missing cookies before IO",
  async (method) => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://backend.example");
    const mock = vi.fn();
    vi.stubGlobal("fetch", mock);
    const run = (headers: Record<string, string>) =>
      method === "PUT"
        ? save(request(method, { scopes: [] }, headers))
        : revoke(request(method, undefined, headers), context);
    expect((await run({ origin: "https://evil.example" })).status).toBe(403);
    expect((await run({ "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await run({ cookie: "" })).status).toBe(401);
    expect(mock).not.toHaveBeenCalled();
  },
);

it("accepts the actual same-origin Host when Next normalizes loopback URLs", async () => {
  vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://backend.example");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([])));
  const req = new NextRequest(
    "http://127.0.0.1:3634/api/identity/oauth/scope-settings",
    {
      method: "PUT",
      headers: {
        host: "127.0.0.1:3634",
        origin: "http://127.0.0.1:3634",
        cookie: "session=private",
        "X-XSRF-TOKEN": "csrf",
      },
      body: JSON.stringify({ scopes: [] }),
    },
  );
  expect((await save(req)).status).toBe(200);
});
