import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const requestBody = {
  category: 1,
  name: "member",
  email: "member@example.com",
  content: "お問い合わせ内容です。",
};

const responseBody = {
  contactIdentifier: "11111111-1111-4111-8111-111111111111",
  identityIdentifier: null,
  ...requestBody,
};

const createRequest = (
  body: unknown = requestBody,
  headers: Record<string, string> = {},
): NextRequest =>
  new Request("https://app.example.test/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;

describe("/api/contact route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards the validated body, Cookie and Accept-Language to the backend", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "https://site.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest(requestBody, {
      "accept-language": "ja",
      cookie: "laravel_session=abc",
    }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(responseBody);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://site.example.test/api/site-management/contact/submit/v1",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "laravel_session=abc",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      },
    );
  });

  it("rejects an invalid request without calling the backend", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "https://site.example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({ ...requestBody, content: "x".repeat(513) }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose backend validation details", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "https://site.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "internal validation rule details" }), {
        status: 422,
      }),
    ));

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual({ message: "Contact request is invalid." });
    expect(body.message).not.toContain("internal validation rule details");
  });

  it("does not expose backend 500 details", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "https://site.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "database host is internal-db" }), {
        status: 500,
      }),
    ));

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ message: "Contact API is temporarily unavailable." });
    expect(body.message).not.toContain("internal-db");
  });

  it("returns a safe error when the backend response schema is invalid", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "https://site.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ contactIdentifier: "invalid" }), { status: 201 }),
    ));

    const response = await POST(createRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      message: "Contact API is temporarily unavailable.",
    });
  });

  it("returns a configuration error when the backend URL is missing", async () => {
    delete process.env.KPOOL_SITE_MANAGEMENT_API_BASE_URL;

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Contact API is not configured." });
  });
});
