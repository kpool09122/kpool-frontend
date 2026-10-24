import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchMyContactDetail, fetchMyContacts, replyToMyContact, submitContact } from "./contactBrowserApi";

const requestBody = {
  category: 1 as const,
  name: "member",
  email: "member@example.com",
  content: "お問い合わせ内容です。",
};

const responseBody = {
  contactIdentifier: "11111111-1111-4111-8111-111111111111",
  principalIdentifier: null,
  ...requestBody,
};

const contactIdentifier = "11111111-1111-4111-8111-111111111111";
const identityIdentifier = "22222222-2222-4222-8222-222222222222";
const replyIdentifier = "33333333-3333-4333-8333-333333333333";

const contact = {
  category: 1,
  contactIdentifier,
  createdAt: "2026-08-29T06:42:40+00:00",
  identityIdentifier,
  name: "Kpool User",
  replyIdentifiers: [replyIdentifier],
  content: "問い合わせ本文",
};

describe("contact browser API", () => {
  it("posts only reply content to the own BFF with CSRF, locale and no retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(replyToMyContact({ contactIdentifier, content: "追加の状況", locale: "ja", fallbackErrorMessage: "failed" })).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/api/site-management/contact/me/${contactIdentifier}/replies`, expect.objectContaining({ method: "POST", cache: "no-store", credentials: "include", headers: expect.objectContaining({ "X-XSRF-TOKEN": "test-csrf-token", "Accept-Language": "ja" }), body: JSON.stringify({ content: "追加の状況" }) }));
  });
  it.each([401, 403, 404, 409, 419, 422, 500])("retains the own reply error status %s without retry", async (status) => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ message: "rejected" }, { status }));
    await expect(replyToMyContact({ contactIdentifier, content: "reply", locale: "ja", fallbackErrorMessage: "failed", fetchAdapter })).rejects.toMatchObject({ contactRouteStatus: status, message: "rejected" });
    expect(fetchAdapter).toHaveBeenCalledTimes(1);
  });
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
        "X-XSRF-TOKEN": "test-csrf-token",
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

  it("preserves the authenticated principal in the submitted contact", async () => {
    const contact = {
      ...responseBody,
      principalIdentifier: "55555555-5555-4555-8555-555555555555",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(contact), { status: 201 }),
    ));

    await expect(submitContact({ locale: "ja", requestBody })).resolves.toEqual({
      ok: true,
      contact,
    });
  });

  it("returns a failure result for an invalid successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ contactIdentifier: "invalid" }), { status: 201 }),
    ));

    await expect(submitContact({ locale: "ja", requestBody })).resolves.toEqual({ ok: false });
  });

  it("fetches the signed-in user's contacts with credentials", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([contact]), { status: 200 }),
    );

    await expect(fetchMyContacts({ fallbackErrorMessage: "failed", fetchAdapter })).resolves.toEqual([contact]);
    expect(fetchAdapter).toHaveBeenCalledWith("/api/site-management/contact/me", {
      cache: "no-store",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("fetches the selected contact's detail", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        ...contact,
        content: "Contact body",
        replies: [{
          content: "Reply body",
          replyIdentifier,
          sentAt: "2026-08-29T07:42:40+00:00",
        }],
      }), { status: 200 }),
    );

    await expect(fetchMyContactDetail({ contactIdentifier, fallbackErrorMessage: "failed", fetchAdapter }))
      .resolves.toMatchObject({ contactIdentifier });
    expect(fetchAdapter).toHaveBeenCalledWith(`/api/site-management/contact/me/${contactIdentifier}`, {
      cache: "no-store",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("surfaces the contact route's response message", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "forbidden" }), { status: 403 }),
    );

    await expect(fetchMyContacts({ fallbackErrorMessage: "failed", fetchAdapter })).rejects.toMatchObject({
      contactRouteStatus: 403,
      message: "forbidden",
    });
  });
});
