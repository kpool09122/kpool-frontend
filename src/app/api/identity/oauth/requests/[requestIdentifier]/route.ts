import type { NextRequest } from "next/server";
import { consentDetailsSchema } from "@/gateways/identity/oauthConsentContract";
import { forwardOAuthRoute } from "../../routeSupport";
export const GET = async (request: NextRequest, context: { params: Promise<{ requestIdentifier: string }> }) => {
  const { requestIdentifier } = await context.params;
  return forwardOAuthRoute(request, { method: "GET", path: `/oauth/requests/${encodeURIComponent(requestIdentifier)}`, responseSchema: consentDetailsSchema });
};
