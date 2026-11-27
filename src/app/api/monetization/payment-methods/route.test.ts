import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { POST as prepare } from "./setup-intents/route";
import { DELETE } from "./[paymentMethodIdentifier]/route";
const id = "11111111-1111-4111-8111-111111111111";
const card = {
  paymentMethodIdentifier: id,
  type: "card",
  brand: "visa",
  last4: "4242",
  expMonth: 12,
  expYear: 2030,
  isDefault: true,
  status: "active",
  archivedAt: null,
};
const req = (method = "GET", body?: unknown, extra = {}) =>
  new NextRequest("http://127.0.0.1/api/monetization/payment-methods", {
    method,
    headers: {
      cookie: "session=private",
      host: "127.0.0.1",
      origin: "http://127.0.0.1",
      "x-xsrf-token": "csrf",
      "accept-language": "ja",
      ...extra,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("uses effective-account routes and forwards only the completion reference, not card data", async () => {
  vi.stubEnv("KPOOL_MONETIZATION_API_BASE_URL", "https://backend.example");
  const fetch = vi.fn().mockResolvedValue(Response.json(card));
  vi.stubGlobal("fetch", fetch);
  const response = await POST(
    req("POST", {
      setupIntentIdentifier: "seti_test",
      number: "not-allowed",
      cvc: "not-allowed",
      accountId: id,
    }),
  );
  expect(response.status).toBe(422);
  expect(fetch).not.toHaveBeenCalled();
  expect(
    (await POST(req("POST", { setupIntentIdentifier: "seti_test" }))).status,
  ).toBe(200);
  expect(fetch).toHaveBeenCalledWith(
    "https://backend.example/api/v1/monetization/payment-methods",
    expect.objectContaining({
      body: JSON.stringify({ setupIntentIdentifier: "seti_test" }),
      headers: expect.objectContaining({
        Cookie: "session=private",
        "Accept-Language": "ja",
        "X-XSRF-TOKEN": "csrf",
      }),
      cache: "no-store",
      redirect: "manual",
    }),
  );
});
it("lists masked fields, strips unexpected upstream secrets and preserves rotated cookies", async () => {
  vi.stubEnv(
    "KPOOL_MONETIZATION_API_BASE_URL",
    "https://backend.example/api/v1/monetization",
  );
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          {
            paymentMethods: [
              { ...card, number: "private", clientSecret: "private" },
            ],
          },
          { headers: { "set-cookie": "session=rotated" } },
        ),
      ),
  );
  const response = await GET(req());
  expect(await response.json()).toEqual({ paymentMethods: [card] });
  expect(response.headers.get("set-cookie")).toBe("session=rotated");
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("prepares without caller input, deletes one internal ID and permits zero cards", async () => {
  vi.stubEnv("KPOOL_MONETIZATION_API_BASE_URL", "https://backend.example");
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json(
        {
          setupIntentIdentifier: "seti_test",
          clientSecret: "seti_test_secret_private",
        },
        { status: 201 },
      ),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(Response.json({ paymentMethods: [] }));
  vi.stubGlobal("fetch", fetch);
  expect((await prepare(req("POST"))).status).toBe(201);
  expect(
    (
      await DELETE(req("DELETE"), {
        params: Promise.resolve({ paymentMethodIdentifier: id }),
      })
    ).status,
  ).toBe(204);
  expect(fetch.mock.calls[1][0]).toBe(
    `https://backend.example/api/v1/monetization/payment-methods/${id}`,
  );
  expect(await (await GET(req())).json()).toEqual({ paymentMethods: [] });
});
it.each([401, 403, 409, 419, 422, 429, 500, 503])(
  "masks error %s while preserving public retry codes and cookies",
  async (status) => {
    vi.stubEnv("KPOOL_MONETIZATION_API_BASE_URL", "https://backend.example");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            {
              code: "recent_authentication_required",
              message: "private secret",
              trace: "private",
            },
            { status, headers: { "set-cookie": "session=rotated" } },
          ),
        ),
    );
    const response = await prepare(req("POST"));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({
      message: expect.any(String),
      ...(status < 500 ? { code: "recent_authentication_required" } : {}),
    });
    expect(response.headers.get("set-cookie")).toBe("session=rotated");
  },
);
it("rejects cross-origin writes, missing sessions/CSRF and invalid IDs before upstream IO", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(
    (await prepare(req("POST", undefined, { origin: "https://evil.example" })))
      .status,
  ).toBe(403);
  expect(
    (await prepare(req("POST", undefined, { "x-xsrf-token": "" }))).status,
  ).toBe(419);
  expect((await GET(req("GET", undefined, { cookie: "" }))).status).toBe(401);
  expect(
    (
      await DELETE(req("DELETE"), {
        params: Promise.resolve({ paymentMethodIdentifier: "../other" }),
      })
    ).status,
  ).toBe(422);
  expect(fetch).not.toHaveBeenCalled();
});
it("fails closed on malformed upstream JSON while retaining cookies", async () => {
  vi.stubEnv("KPOOL_MONETIZATION_API_BASE_URL", "https://backend.example");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("invalid", {
          headers: { "set-cookie": "session=rotated" },
        }),
      ),
  );
  const response = await GET(req());
  expect(response.status).toBe(502);
  expect(response.headers.get("set-cookie")).toBe("session=rotated");
});
