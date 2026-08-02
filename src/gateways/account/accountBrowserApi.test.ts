import { describe, expect, it, vi } from "vitest";

import {
  fetchAccountDocuments,
  fetchAccountMembers,
  fetchPrincipalGroups,
  isAccountBrowserApiError,
  updatePrincipalGroupMembers,
  uploadAccountDocuments,
} from "./accountBrowserApi";

const memberResponse = {
  members: [
    {
      principalIdentifier: "11111111-1111-4111-8111-111111111111",
      identityIdentifier: "22222222-2222-4222-8222-222222222222",
      identityName: "member",
      email: "member@example.com",
      principalGroups: [],
    },
  ],
};

const principalGroupsResponse = {
  principalGroups: [
    {
      principalGroupIdentifier: "33333333-3333-4333-8333-333333333333",
      accountIdentifier: "44444444-4444-4444-8444-444444444444",
      name: "Managers",
      roleIdentifiers: [],
      isDefault: false,
      members: [],
    },
  ],
};

const documentsResponse = {
  documents: [
    {
      documentType: "passport",
      documentPath: "accounts/documents/passport.pdf",
      uploadedAt: "2026-08-02T00:00:00Z",
    },
  ],
};

describe("account browser API", () => {
  it("fetches account members with credentials", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(memberResponse), { status: 200 }),
    );

    await expect(fetchAccountMembers({ fallbackErrorMessage: "failed", fetchAdapter })).resolves.toEqual(memberResponse);
    expect(fetchAdapter).toHaveBeenCalledWith("/api/account/members", {
      cache: "no-store",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("fetches principal groups and surfaces route errors", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "forbidden" }), { status: 403 }),
    );

    await expect(fetchPrincipalGroups({ fallbackErrorMessage: "failed", fetchAdapter })).rejects.toThrow("forbidden");
    await expect(fetchPrincipalGroups({ fallbackErrorMessage: "failed", fetchAdapter })).rejects.toMatchObject({
      accountRouteStatus: 403,
    });
  });

  it("exposes the HTTP status for account route errors", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "permission changed" }), { status: 403 }),
    );

    await expect(fetchAccountMembers({ fallbackErrorMessage: "failed", fetchAdapter })).rejects.toSatisfy(
      (error: unknown) =>
        isAccountBrowserApiError(error) &&
        error.message === "permission changed" &&
        error.accountRouteStatus === 403,
    );
  });

  it("fetches account documents with credentials", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(documentsResponse), { status: 200 }),
    );

    await expect(fetchAccountDocuments({
      accountIdentifier: "22222222-2222-2222-2222-222222222222",
      fallbackErrorMessage: "failed",
      fetchAdapter,
    })).resolves.toEqual(documentsResponse);
    expect(fetchAdapter).toHaveBeenCalledWith("/api/account/accounts/22222222-2222-2222-2222-222222222222/documents", {
      cache: "no-store",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("uploads account documents as JSON and returns parsed documents", async () => {
    const requestBody = { documents: [{ documentType: "passport", fileContents: "YWJj" }] };
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(documentsResponse), { status: 200 }),
    );

    await expect(uploadAccountDocuments({
      accountIdentifier: "22222222-2222-2222-2222-222222222222",
      fallbackErrorMessage: "failed",
      fetchAdapter,
      requestBody,
    })).resolves.toEqual(documentsResponse);
    expect(fetchAdapter).toHaveBeenCalledWith("/api/account/accounts/22222222-2222-2222-2222-222222222222/documents", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  });

  it("updates principal group members with the final membership payload", async () => {
    const requestBody = {
      principalGroups: [
        {
          principalGroupIdentifier: principalGroupsResponse.principalGroups[0].principalGroupIdentifier,
          principalIdentifiers: [memberResponse.members[0].principalIdentifier],
        },
      ],
    };
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(principalGroupsResponse), { status: 200 }),
    );

    await expect(updatePrincipalGroupMembers({
      fallbackErrorMessage: "failed",
      fetchAdapter,
      requestBody,
    })).resolves.toEqual(principalGroupsResponse);
    expect(fetchAdapter).toHaveBeenCalledWith("/api/account/principal-groups/members", {
      method: "PATCH",
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  });
});
