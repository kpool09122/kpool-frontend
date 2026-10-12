import { describe, expect, it, vi } from "vitest";
import { accountApiTypes } from "@kpool/types";
import { dictionaries } from "@/i18n/dictionaries";
import {
  fetchLatestAccountCategoryChangeRequest,
  withdrawAccountCategoryChangeRequest,
} from "./accountBrowserApi";
import {
  parseAccountCategoryChangeRequestDetailResponse,
  parseListAccountCategoryChangeRequestsResponse,
  parseLatestAccountCategoryChangeRequestResponse,
} from "./accountApi";

const summary = {
  requestIdentifier: "request",
  accountIdentifier: "account",
  currentAccountCategory: "general",
  requestedAccountCategory: "agency",
  requestedAt: "today",
  status: "withdrawn",
};
describe("self-service category change contract", () => {
  it("matches the existing generated nullable endpoint contract", () => {
    const endpoint = accountApiTypes.accountApi.api.find(
      (endpoint) =>
        endpoint.alias ===
        "AccountCategoryChangeRequestOperations_getLatestAccountCategoryChangeRequest",
    );
    expect(endpoint?.response.safeParse({ request: null })).toEqual({
      success: true,
      data: parseLatestAccountCategoryChangeRequestResponse({ request: null }),
    });
    expect(
      endpoint?.response.safeParse({
        request: { ...summary, status: "pending" },
      }),
    ).toEqual({
      success: true,
      data: parseLatestAccountCategoryChangeRequestResponse({
        request: { ...summary, status: "pending" },
      }),
    });
  });
  it("fetches null with encoded account scope, locale and credentials", async () => {
    const fetchAdapter = vi
      .fn()
      .mockResolvedValue(Response.json({ request: null }));
    expect(
      await fetchLatestAccountCategoryChangeRequest({
        accountIdentifier: "account/1",
        locale: "ko",
        fallbackErrorMessage: "failed",
        fetchAdapter,
      }),
    ).toEqual({ request: null });
    expect(fetchAdapter).toHaveBeenCalledWith(
      "/api/account/accounts/account%2F1/category-change-requests/latest",
      expect.objectContaining({
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", "Accept-Language": "ko" },
      }),
    );
  });
  it("withdraws using the dedicated scoped API with no request body", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json(summary));
    expect(
      await withdrawAccountCategoryChangeRequest({
        accountIdentifier: "account/1",
        requestId: "request/1",
        locale: "en",
        fallbackErrorMessage: "failed",
        fetchAdapter,
      }),
    ).toEqual(summary);
    expect(fetchAdapter).toHaveBeenCalledWith(
      "/api/account/accounts/account%2F1/category-change-requests/request%2F1/withdraw",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json", "Accept-Language": "en" },
      }),
    );
  });
  it.each(["latest", "withdraw"])(
    "rejects malformed %s and preserves API error status",
    async (kind) => {
      const call = (fetchAdapter: typeof fetch) =>
        kind === "latest"
          ? fetchLatestAccountCategoryChangeRequest({
              accountIdentifier: "account",
              fallbackErrorMessage: "failed",
              fetchAdapter,
            })
          : withdrawAccountCategoryChangeRequest({
              accountIdentifier: "account",
              requestId: "request",
              fallbackErrorMessage: "failed",
              fetchAdapter,
            });
      for (const body of [
        {},
        "invalid json",
        { request: { status: "unknown" } },
      ]) {
        await expect(
          call(
            vi
              .fn()
              .mockResolvedValue(
                new Response(
                  typeof body === "string" ? body : JSON.stringify(body),
                ),
              ),
          ),
        ).rejects.toBeInstanceOf(Error);
      }
      for (const status of [401, 403, 404, 422, 500]) {
        await expect(
          call(
            vi
              .fn()
              .mockResolvedValue(
                Response.json({ message: "failed" }, { status }),
              ),
          ),
        ).rejects.toMatchObject({
          accountRouteStatus: status,
          message: "failed",
        });
      }
      await expect(
        call(vi.fn().mockRejectedValue(new Error("offline"))),
      ).rejects.toThrow("offline");
    },
  );
  it("parses withdrawn through existing management list/detail schemas", () => {
    const account = {
      accountIdentifier: "account",
      email: "test@example.com",
      name: "test",
      type: "individual",
      status: "active",
      accountCategory: "general",
    };
    expect(
      parseListAccountCategoryChangeRequestsResponse({
        requests: [{ ...summary, account }],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 20,
      }).requests[0].status,
    ).toBe("withdrawn");
    expect(
      parseAccountCategoryChangeRequestDetailResponse({
        request: summary,
        account,
        identities: [],
        documents: [],
      }).request.status,
    ).toBe("withdrawn");
  });
  it("has matching nonempty strings for every locale", () => {
    for (const dictionary of Object.values(dictionaries)) {
      const strings = dictionary.admin.accountCategoryChange;
      expect(Object.keys(strings).sort()).toEqual(
        Object.keys(dictionaries.ja.admin.accountCategoryChange).sort(),
      );
      for (const value of Object.values(strings))
        expect(
          typeof value === "string"
            ? value.length
            : Object.values(value).every(Boolean),
        ).toBeTruthy();
    }
  });
});
