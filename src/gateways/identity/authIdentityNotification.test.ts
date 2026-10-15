import { afterEach, expect, it, vi } from "vitest";
import { fetchAuthenticatedIdentity } from "./authIdentity";
import {
  canReadAccountNotificationSettings,
  canUpdateAccountNotificationSettings,
} from "../account/accountPolicy";
afterEach(() => vi.unstubAllEnvs());
it.each(["none", "read", "update"])(
  "keeps SSR notification mock policy %s independent from general permissions",
  async (value) => {
    vi.stubEnv("KPOOL_ENABLE_MOCK_WIKI_GATEWAY", "1");
    const identity = await fetchAuthenticatedIdentity({
      cookieHeader: `kpool-mock-account-policy=update; kpool-mock-account-notification-policy=${value}`,
    });
    expect(canReadAccountNotificationSettings(identity)).toBe(value !== "none");
    expect(canUpdateAccountNotificationSettings(identity)).toBe(
      value === "update",
    );
  },
);
it("does not use mock notification cookies outside explicit mock mode", async () => {
  vi.stubEnv("KPOOL_ENABLE_MOCK_WIKI_GATEWAY", "0");
  vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "");
  expect(
    await fetchAuthenticatedIdentity({
      cookieHeader:
        "kpool-mock-account-policy=update; kpool-mock-account-notification-policy=update",
    }),
  ).toBeNull();
});
