import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";

import { forwardIdentityRoute } from "../../routeSupport";

export const POST = (request: NextRequest) => forwardIdentityRoute(request, {
  method: "POST",
  path: "/auth/passkeys/authentication",
  requestSchema: identityApiTypes.schemas.AuthenticateWithPasskeyRequestBody,
  responseSchema: identityApiTypes.schemas.IdentitySummary,
});
