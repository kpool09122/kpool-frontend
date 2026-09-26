import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";

import { forwardIdentityRoute } from "../../../routeSupport";

export const POST = (request: NextRequest) => forwardIdentityRoute(request, {
  method: "POST",
  path: "/auth/passkeys/registration/options",
  requestSchema: identityApiTypes.schemas.CreatePasskeyRegistrationOptionsRequestBody,
  responseSchema: identityApiTypes.schemas.PasskeyRegistrationOptionsResult,
});
