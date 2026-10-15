import { accountApiTypes } from "@kpool/types";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAccountApiBaseUrl } from "@/gateways/account/accountApi";
import { getForwardHeaders, readResponseBody } from "../../../routeSupport";
type Context = { params: Promise<{ accountId: string }> };
const forward = async (
  request: NextRequest,
  context: Context,
  method: "GET" | "PUT",
) => {
  const cookies: string[] = [];
  const respond = (body: unknown, status: number) => {
    const response = NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
    cookies.forEach((cookie) => response.headers.append("Set-Cookie", cookie));
    return response;
  };
  const baseUrl = getAccountApiBaseUrl();
  if (!baseUrl)
    return respond({ message: "Account API is not configured." }, 500);
  const { accountId } = await context.params;
  if (!z.string().uuid().safeParse(accountId).success)
    return respond({ message: "Invalid account." }, 400);
  try {
    const payload: unknown =
      method === "PUT" ? await request.json().catch(() => null) : null;
    if (method === "PUT" && payload === null)
      return respond({ message: "Invalid JSON." }, 400);
    const parsed =
      method === "PUT"
        ? accountApiTypes.schemas.UpdateAccountNotificationSettingsBody.safeParse(
            payload,
          )
        : null;
    if (parsed && !parsed.success)
      return respond({ message: "Invalid notification settings." }, 422);
    const upstream = await fetch(
      `${baseUrl}/accounts/${encodeURIComponent(accountId)}/notification-settings`,
      {
        method,
        cache: "no-store",
        headers: getForwardHeaders(request, method === "PUT"),
        ...(parsed?.success
          ? {
              body: JSON.stringify({
                recipients: parsed.data.recipients.map(
                  ({ identityIdentifier, channel }) => ({
                    identityIdentifier,
                    channel,
                  }),
                ),
              }),
            }
          : {}),
      },
    );
    cookies.push(...upstream.headers.getSetCookie());
    const body = await readResponseBody(upstream);
    if (!upstream.ok)
      return respond(
        { message: "Notification settings request failed." },
        upstream.status,
      );
    const result = (
      method === "GET"
        ? accountApiTypes.schemas.AccountNotificationSettings
        : z.array(z.unknown()).length(0)
    ).safeParse(body);
    return result.success
      ? respond(result.data, 200)
      : respond({ message: "Invalid notification settings response." }, 502);
  } catch {
    return respond({ message: "Notification settings are unavailable." }, 502);
  }
};
export const GET = (request: NextRequest, context: Context) =>
  forward(request, context, "GET");
export const PUT = (request: NextRequest, context: Context) =>
  forward(request, context, "PUT");
