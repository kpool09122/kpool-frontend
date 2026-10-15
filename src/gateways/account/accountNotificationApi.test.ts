import { describe, expect, it, vi } from "vitest";
import { requestAccountNotificationSettings } from "./accountNotificationApi";
const data = { recipients: [], candidates: [], maxRecipients: 0 };
describe("notification browser gateway", () => {
  it("fetches and validates settings with credentials, language and no cache", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(data));
    expect(
      await requestAccountNotificationSettings(
        "account",
        "en",
        undefined,
        fetch,
      ),
    ).toEqual(data);
    expect(fetch).toHaveBeenCalledWith(
      "/api/account/accounts/account/notification-settings",
      expect.objectContaining({
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "Accept-Language": "en" },
      }),
    );
  });
  it("accepts [] PUT and rejects malformed success", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json({}));
    expect(
      await requestAccountNotificationSettings(
        "account",
        "ja",
        { recipients: [] },
        fetch,
      ),
    ).toBeNull();
    await expect(
      requestAccountNotificationSettings(
        "account",
        "ja",
        { recipients: [] },
        fetch,
      ),
    ).rejects.toBeDefined();
  });
  it.each([401, 403, 422, 500])(
    "marks status %i for auth/error handling without backend details",
    async (status) => {
      const fetch = vi
        .fn()
        .mockResolvedValue(Response.json({ message: "secret" }, { status }));
      await expect(
        requestAccountNotificationSettings("account", "ja", undefined, fetch),
      ).rejects.toMatchObject({
        accountRouteStatus: status,
        message: "Notification request failed",
      });
    },
  );
});
