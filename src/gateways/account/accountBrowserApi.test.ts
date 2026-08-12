import { describe, expect, it, vi } from "vitest";

import {
  approveAccountCategoryChangeRequest,
  fetchAccountCategoryChangeRequestDetail,
  fetchAccountCategoryChangeRequests,
  fetchAccountDocuments,
  fetchAccountMembers,
  fetchPrincipalGroups,
  isAccountBrowserApiError,
  rejectAccountCategoryChangeRequest,
  requestAccountCategoryChange,
  updateAccount,
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
    expect(fetchAdapter).toHaveBeenCalledWith("/api/account/my/documents", {
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

  it("updates an account with phone and address in the request body", async () => {
    const requestBody = {
      accountName: "Updated Account",
      phone: "03-1234-5678",
      address: {
        countryCode: "JP",
        administrativeAreaCode: "13",
        postalCode: "100-0001",
        locality: "千代田区",
        addressLine1: "丸の内1-1-1",
        addressLine2: null,
      },
    };
    const responseBody = {
      accountIdentifier: "22222222-2222-2222-2222-222222222222",
      email: "member@example.com",
      type: "corporation",
      name: requestBody.accountName,
      status: "active",
      accountCategory: "standard",
      phone: requestBody.phone,
      address: requestBody.address,
    };
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 }),
    );

    await expect(updateAccount({
      accountIdentifier: "22222222-2222-2222-2222-222222222222",
      fallbackErrorMessage: "failed",
      fetchAdapter,
      requestBody,
    })).resolves.toMatchObject({ phone: requestBody.phone, address: requestBody.address });
    expect(fetchAdapter).toHaveBeenCalledWith("/api/account/accounts/22222222-2222-2222-2222-222222222222", {
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

  it("calls account category change request browser routes", async () => {
    const requestSummary = {
      requestIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accountIdentifier: "22222222-2222-2222-2222-222222222222",
      currentAccountCategory: "general",
      requestedAccountCategory: "agency",
      status: "pending",
      requestedAt: "2026-08-11T00:00:00Z",
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
    };
    const requestListItem = {
      ...requestSummary,
      account: { accountIdentifier: requestSummary.accountIdentifier, email: "member@example.com", type: "corporation", name: "Member", status: "active", accountCategory: "general" },
    };
    const detail = {
      request: requestSummary,
      account: { accountIdentifier: requestSummary.accountIdentifier, email: "member@example.com", type: "corporation", name: "Member", status: "active", accountCategory: "general" },
      identities: [{ name: "member", email: "member@example.com" }],
      documents: [{ documentType: "passport", documentPath: "passport.pdf", uploadedAt: "2026-08-11T00:00:00Z" }],
    };
    const fetchAdapter = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/approve") || url.includes("/reject") || url.includes("/category-change-requests") && !url.includes("account-category")) return Promise.resolve(new Response(JSON.stringify(requestSummary), { status: 200 }));
      if (url.includes("account-category-change-requests/aaaaaaaa")) return Promise.resolve(new Response(JSON.stringify(detail), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ requests: [requestListItem], current_page: 1, last_page: 1, total: 1, per_page: 20 }), { status: 200 }));
    });

    await expect(requestAccountCategoryChange({ accountIdentifier: requestSummary.accountIdentifier, fallbackErrorMessage: "failed", fetchAdapter, requestBody: { requestedAccountCategory: "agency" } })).resolves.toEqual(requestSummary);
    await expect(fetchAccountCategoryChangeRequests({ fallbackErrorMessage: "failed", fetchAdapter, page: 1 })).resolves.toMatchObject({ requests: [requestListItem] });
    await expect(fetchAccountCategoryChangeRequestDetail({ fallbackErrorMessage: "failed", fetchAdapter, requestId: requestSummary.requestIdentifier })).resolves.toEqual(detail);
    await expect(approveAccountCategoryChangeRequest({ fallbackErrorMessage: "failed", fetchAdapter, requestId: requestSummary.requestIdentifier })).resolves.toEqual(requestSummary);
    await expect(rejectAccountCategoryChangeRequest({ fallbackErrorMessage: "failed", fetchAdapter, requestBody: { rejectionReasonCode: "other", rejectionReasonDetail: "missing" }, requestId: requestSummary.requestIdentifier })).resolves.toEqual(requestSummary);
  });

});
