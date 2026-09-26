import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";

import { forwardIdentityRoute } from "../../routeSupport";

export const POST = (request: NextRequest) => forwardIdentityRoute(request, {
  method: "POST",
  path: "/auth/passkeys/addition",
  requestSchema: identityApiTypes.schemas.AddPasskeyRequestBody,
  responseSchema: identityApiTypes.schemas.KPool_Common_EmptyJsonObject,
});
