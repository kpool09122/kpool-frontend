import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";

import { forwardIdentityRoute } from "../routeSupport";

export const POST = (request: NextRequest) => forwardIdentityRoute(request, {
  method: "POST",
  path: "/auth/send-auth-code",
  requestSchema: identityApiTypes.schemas.SendAuthCodeRequestBody,
  responseSchema: identityApiTypes.schemas.KPool_Common_EmptyJsonObject,
});
