import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "./route";
const id = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ accountId: id }) };
const settings = {
  candidates: [
    {
      identityIdentifier: id,
      name: "Member",
      email: "member@example.com",
      language: "ja",
    },
  ],
  recipients: [{ identityIdentifier: id, channel: "email" }],
  maxRecipients: 1,
};
const request = (method = "GET", body?: unknown) =>
  new NextRequest(
    `http://localhost/api/account/accounts/${id}/notification-settings`,
    {
      method,
      headers: {
        Cookie: "session=test",
        "Accept-Language": "ko",
        "X-XSRF-TOKEN": "csrf-test",
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://backend.example");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("notification settings BFF", () => {
  it("rejects invalid request JSON without calling backend", async () => {
    const malformed = new NextRequest("http://localhost", {
      method: "PUT",
      body: "not json",
    });
    expect((await PUT(malformed, context)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards GET without cache and preserves cookie/language and rotated cookies", async () => {
    fetchMock.mockResolvedValue(
      Response.json(settings, { headers: { "Set-Cookie": "session=rotated" } }),
    );
    const response = await GET(request(), context);
    expect(await response.json()).toEqual(settings);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://backend.example/api/v1/account/accounts/${id}/notification-settings`,
      expect.objectContaining({
        cache: "no-store",
        method: "GET",
        headers: expect.objectContaining({
          Cookie: "session=test",
          "Accept-Language": "ko",
        }),
      }),
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.getSetCookie()).toEqual(["session=rotated"]);
  });
  it("accepts PUT empty success and strips unknown request fields", async () => {
    fetchMock.mockResolvedValue(Response.json([]));
    const response = await PUT(
      request("PUT", { recipients: [], secret: "not forwarded" }),
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "PUT",
      body: '{"recipients":[]}',
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": "csrf-test",
      },
    });
  });
  it.each([401, 403, 404, 422, 500])(
    "preserves %i without leaking backend details",
    async (status) => {
      fetchMock.mockResolvedValue(
        Response.json(
          { message: "secret token stack" },
          { status, headers: { "Set-Cookie": "session=expired" } },
        ),
      );
      const response = await GET(request(), context);
      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain("secret");
      expect(response.headers.getSetCookie()).toEqual(["session=expired"]);
    },
  );
  it.each([
    { recipients: [{ identityIdentifier: id, channel: "line" }] },
    {
      recipients: Array.from({ length: 6 }, () => ({
        identityIdentifier: id,
        channel: "email",
      })),
    },
    { recipients: [{ identityIdentifier: "bad", channel: "email" }] },
  ])("rejects malformed request %j", async (body) => {
    expect((await PUT(request("PUT", body), context)).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("preserves Set-Cookie on schema failure", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { candidates: [] },
        { headers: { "Set-Cookie": "session=rotated" } },
      ),
    );
    const response = await GET(request(), context);
    expect(response.status).toBe(502);
    expect(response.headers.getSetCookie()).toEqual(["session=rotated"]);
  });
  it("rejects nonempty PUT success response", async () => {
    fetchMock.mockResolvedValue(Response.json(["invalid"]));
    expect(
      (await PUT(request("PUT", { recipients: [] }), context)).status,
    ).toBe(502);
  });
  it("handles unconfigured backend, invalid id, network and invalid JSON responses", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "");
    expect((await GET(request(), context)).status).toBe(500);
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://backend.example");
    expect(
      (
        await GET(request(), {
          params: Promise.resolve({ accountId: "../secret" }),
        })
      ).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRejectedValueOnce(new Error("secret"));
    expect((await GET(request(), context)).status).toBe(502);
    fetchMock.mockResolvedValueOnce(new Response("not json"));
    expect((await GET(request(), context)).status).toBe(502);
  });
});
