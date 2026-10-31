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
  replies: [],
  content: "問い合わせ本文",
};

describe("contact browser API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

  it("posts a submitter reply to the own-contact endpoint with CSRF and only content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await replyToMyContact({ contactIdentifier, content: "Follow-up", locale: "ja", fallbackErrorMessage: "failed" });
    expect(fetchMock).toHaveBeenCalledWith(`/api/site-management/contact/me/${contactIdentifier}/replies`, expect.objectContaining({
      method: "POST", credentials: "include", body: JSON.stringify({ content: "Follow-up" }),
      headers: expect.objectContaining({ "X-XSRF-TOKEN": "test-csrf-token", "Accept-Language": "ja" }),
    }));
  });

  it("preserves reply failure status so callers can reconcile saved history", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ message: "Notification failed" }, { status: 500 }));
    await expect(replyToMyContact({ contactIdentifier, content: "Follow-up", locale: "ja", fallbackErrorMessage: "failed", fetchAdapter }))
      .rejects.toMatchObject({ contactRouteStatus: 500, message: "Notification failed" });
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
