import { afterEach, describe, expect, it, vi } from "vitest";

import { submitContact } from "./contactBrowserApi";

const requestBody = {
  category: 1 as const,
  name: "member",
  email: "member@example.com",
  content: "お問い合わせ内容です。",
};

const responseBody = {
  contactIdentifier: "11111111-1111-4111-8111-111111111111",
  identityIdentifier: null,
  ...requestBody,
};

describe("contact browser API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts the inquiry to the BFF with the current locale and credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitContact({ locale: "ja", requestBody });

    expect(result).toEqual({ ok: true, contact: responseBody });
    expect(fetchMock).toHaveBeenCalledWith("/api/contact", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Language": "ja",
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestBody),
    });
  });

  it("returns a failure result for a rejected request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "invalid" }), { status: 422 }),
    ));

    await expect(submitContact({ locale: "ja", requestBody })).resolves.toEqual({ ok: false });
  });

  it("returns a failure result for an invalid successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ contactIdentifier: "invalid" }), { status: 201 }),
    ));

    await expect(submitContact({ locale: "ja", requestBody })).resolves.toEqual({ ok: false });
  });
});
