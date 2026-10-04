import { describe, expect, it, vi } from "vitest";

import {
  completeInitialSetup,
  isAccountBrowserApiError,
} from "./accountBrowserApi";

describe("completeInitialSetup", () => {
  it("posts the account type with credentials and accepts 204", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    await expect(completeInitialSetup({
      fallbackErrorMessage: "setup failed",
      fetchAdapter,
      requestBody: { accountType: "individual" },
    })).resolves.toBeUndefined();
    expect(fetchAdapter).toHaveBeenCalledWith("/api/account/accounts/setup", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accountType: "individual" }),
    });
  });

  it.each([401, 403, 409, 422])("preserves status and code for %s", async (status) => {
    const fetchAdapter = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: "setup required",
      code: "account_setup_required",
    }), { status }));

    const error = await completeInitialSetup({
      fallbackErrorMessage: "setup failed",
      fetchAdapter,
      requestBody: { accountType: "corporation" },
    }).catch((caught: unknown) => caught);

    expect(isAccountBrowserApiError(error)).toBe(true);
    if (isAccountBrowserApiError(error)) {
      expect(error.accountRouteStatus).toBe(status);
      expect(error.accountRouteCode).toBe("account_setup_required");
    }
  });
});
