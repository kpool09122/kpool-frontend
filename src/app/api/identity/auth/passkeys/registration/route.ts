import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";

import { forwardIdentityRoute } from "../../routeSupport";

export const POST = (request: NextRequest) => forwardIdentityRoute(request, {
  method: "POST",
  path: "/auth/passkeys/registration",
  requestSchema: identityApiTypes.schemas.RegisterWithPasskeyRequestBody,
  responseSchema: identityApiTypes.schemas.PasskeyIdentityRegistrationResult,
  successStatus: 201,
});
