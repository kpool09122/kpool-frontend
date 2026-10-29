import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const id = "00000000-0000-4000-8000-000000000001";
const run = (headers = {}, videoLinkId = id) => POST(new NextRequest(`http://localhost/api/wiki/videos/${id}/watched`, {
  method: "POST", headers: { Cookie: "session=old", "X-XSRF-TOKEN": "csrf", ...headers },
}), { params: Promise.resolve({ videoLinkId }) });

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("requires a session, CSRF, matching origin and valid identifier before forwarding completion", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await run({ Cookie: "" })).status).toBe(401);
  expect((await run({ "X-XSRF-TOKEN": "" })).status).toBe(403);
  expect((await run({ Origin: "https://other.example" })).status).toBe(403);
  expect((await run({}, "../bad")).status).toBe(422);
  expect(fetcher).not.toHaveBeenCalled();
});

it("forwards completion without caller-supplied ownership and preserves rotated cookies", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { "set-cookie": "session=new; HttpOnly" } }));
  vi.stubGlobal("fetch", fetcher);
  const response = await run();
  expect(response.status).toBe(204);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("set-cookie")).toContain("session=new");
  expect(fetcher).toHaveBeenCalledWith(`https://backend.example/api/v1/wiki/video-link/${id}/watched`, {
    method: "POST", cache: "no-store", headers: expect.objectContaining({ Cookie: "session=old", "X-XSRF-TOKEN": "csrf" }),
  });
});

it.each([401, 403, 404, 419, 422, 429, 500, 503])("preserves error status %s and hides upstream details", async (status) => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "SQL secret", trace: "private" }, { status, headers: { "set-cookie": "session=new" } })));
  const response = await run();
  expect(response.status).toBe(status);
  expect(await response.text()).not.toMatch(/SQL|secret|trace/);
  expect(response.headers.get("set-cookie")).toContain("session=new");
});
