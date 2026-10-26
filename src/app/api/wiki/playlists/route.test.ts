import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { GET as detail, PUT, DELETE } from "./[playlistId]/route";
const id = "00000000-0000-4000-8000-000000000001";
const request = (method = "GET", body?: unknown, cookie = "session=old") =>
  new NextRequest("http://localhost/api/wiki/playlists", {
    method,
    headers: {
      Cookie: cookie,
      "Accept-Language": "ko",
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": "csrf",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const context = { params: Promise.resolve({ playlistId: id }) };
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("requires cookie, validates bodies and UUID before upstream I/O", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await GET(request("GET", undefined, ""))).status).toBe(401);
  expect((await POST(request("POST", { name: " " }))).status).toBe(422);
  expect(
    (
      await PUT(
        request("PUT", {
          name: "Name",
          items: [
            {
              provider: "youtube",
              externalVideoId: "abcdefghijk",
              videoLinkIdentifier: id,
            },
          ],
        }),
        context,
      )
    ).status,
  ).toBe(422);
  expect(
    (
      await detail(request(), {
        params: Promise.resolve({ playlistId: "bad" }),
      })
    ).status,
  ).toBe(422);
  expect(fetcher).not.toHaveBeenCalled();
});
it("forwards CSRF, cookie, locale and keeps 204 empty and private", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  const fetcher = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(null, {
        status: 204,
        headers: { "Set-Cookie": "session=new" },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  for (const response of [
    await PUT(request("PUT", { name: "New", items: [] }), context),
    await DELETE(request("DELETE"), context),
  ]) {
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toContain("session=new");
  }
  expect(fetcher.mock.calls[0][1].headers).toMatchObject({
    Cookie: "session=old",
    "Accept-Language": "ko",
    "X-XSRF-TOKEN": "csrf",
  });
});
it.each([401, 403, 404, 409, 419, 422, 500])(
  "masks errors %s and preserves rotated cookies",
  async (status) => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: "SQL secret", trace: "secret" },
            { status, headers: { "Set-Cookie": "session=new" } },
          ),
        ),
    );
    const response = await GET(request());
    expect(response.status).toBe(status);
    expect(await response.text()).not.toContain("secret");
    expect(response.headers.get("set-cookie")).toContain("session=new");
  },
);
it("forwards only the recognized inactive-principal code for the existing access monitor", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { code: "principal_inactive", message: "secret", trace: "secret" },
          { status: 403 },
        ),
      ),
  );
  const response = await GET(request());
  expect(await response.json()).toEqual({
    message: "Playlist operation unavailable.",
    code: "principal_inactive",
  });
});
it("handles unavailable configuration and invalid responses without exposing payloads", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "");
  expect((await GET(request())).status).toBe(503);
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  for (const body of ["not JSON", "{}"]) {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(body, { headers: { "Set-Cookie": "session=new" } }),
        ),
    );
    const response = await GET(request());
    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toContain("session=new");
  }
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret")));
  expect((await GET(request())).status).toBe(502);
});
it("validates created summaries with code-point names and strips internal fields", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json(
        {
          playlistIdentifier: id,
          name: "😀".repeat(32),
          videoCount: 0,
          createdAt: "2026-10-26T00:00:00Z",
          updatedAt: "2026-10-26T00:00:00Z",
          secret: "internal",
        },
        { status: 201 },
      ),
    ),
  );
  const response = await POST(request("POST", { name: "😀".repeat(32) }));
  expect(response.status).toBe(201);
  expect(await response.text()).not.toContain("internal");
});
it("rejects a created response that violates the empty-list contract", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          {
            playlistIdentifier: id,
            name: "Not empty",
            videoCount: 1,
            createdAt: "2026-10-26T00:00:00Z",
            updatedAt: "2026-10-26T00:00:00Z",
          },
          { status: 201 },
        ),
      ),
  );
  expect((await POST(request("POST", { name: "New" }))).status).toBe(502);
});
it("rejects incomplete detail instead of allowing an accidental clear save", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json(
        {
          playlistIdentifier: id,
          name: "Name",
          videoCount: 1,
          createdAt: "2026-10-26T00:00:00Z",
          updatedAt: "2026-10-26T00:00:00Z",
        },
        { headers: { "Set-Cookie": "session=new" } },
      ),
    ),
  );
  const response = await detail(request(), context);
  expect(response.status).toBe(502);
  expect(response.headers.get("set-cookie")).toContain("session=new");
});
