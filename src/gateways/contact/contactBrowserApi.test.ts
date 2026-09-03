import { describe, expect, it, vi } from "vitest";

import { fetchMyContactDetail, fetchMyContacts } from "./contactBrowserApi";

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
};

describe("contact browser API", () => {
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
