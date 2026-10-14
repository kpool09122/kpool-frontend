import { accountApiTypes } from "@kpool/types";
import { z } from "zod";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
export type AccountNotificationSettings = z.infer<
  typeof accountApiTypes.schemas.AccountNotificationSettings
>;
export type UpdateAccountNotificationSettings = z.infer<
  typeof accountApiTypes.schemas.UpdateAccountNotificationSettingsBody
>;
export const requestAccountNotificationSettings = async (
  accountId: string,
  locale: string,
  requestBody?: UpdateAccountNotificationSettings,
  fetchAdapter = browserApiFetch,
) => {
  const response = await fetchAdapter(
    `/api/account/accounts/${encodeURIComponent(accountId)}/notification-settings`,
    {
      method: requestBody ? "PUT" : "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Accept-Language": locale,
        ...(requestBody ? { "Content-Type": "application/json" } : {}),
      },
      ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
    },
  );
  if (!response.ok)
    throw Object.assign(new Error("Notification request failed"), {
      accountRouteStatus: response.status,
    });
  const body: unknown = await response.json();
  if (requestBody) {
    parseWithSchemaLog(
      "notification update",
      z.array(z.unknown()).length(0),
      body,
    );
    return null;
  }
  return parseWithSchemaLog(
    "notification settings",
    accountApiTypes.schemas.AccountNotificationSettings,
    body,
  );
};
