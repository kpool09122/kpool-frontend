import type { NextRequest } from "next/server";
import { consentContinuationSchema } from "@/gateways/identity/oauthConsentContract";
import { forwardOAuthRoute } from "../../../routeSupport";
export const POST = async (request: NextRequest, context: { params: Promise<{ requestIdentifier: string }> }) => {
  const { requestIdentifier } = await context.params;
  return forwardOAuthRoute(request, { method: "POST", path: `/oauth/requests/${encodeURIComponent(requestIdentifier)}/deny`, responseSchema: consentContinuationSchema });
};
