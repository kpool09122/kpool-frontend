import type { NextRequest } from "next/server";
import { schemas, consentContinuationSchema } from "@/gateways/identity/oauthConsentContract";
import { forwardOAuthRoute } from "../../../routeSupport";
const approvalSchema = schemas.ApproveAuthorizationBody.strip().refine(({ scopes }) => scopes.length > 0 && new Set(scopes).size === scopes.length);
export const POST = async (request: NextRequest, context: { params: Promise<{ requestIdentifier: string }> }) => {
  const { requestIdentifier } = await context.params;
  return forwardOAuthRoute(request, { method: "POST", path: `/oauth/requests/${encodeURIComponent(requestIdentifier)}/approve`, responseSchema: consentContinuationSchema, requestSchema: approvalSchema });
};
