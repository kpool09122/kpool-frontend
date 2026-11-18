import type { NextRequest } from "next/server";
import { schemas, consentCreateSchema } from "@/gateways/identity/oauthConsentContract";
import { forwardOAuthRoute } from "../routeSupport";
export const POST = (request: NextRequest) => forwardOAuthRoute(request, {
  method: "POST", path: "/oauth/requests", requestSchema: consentCreateSchema,
  responseSchema: schemas.PendingAuthorizationResult.strip(),
});
