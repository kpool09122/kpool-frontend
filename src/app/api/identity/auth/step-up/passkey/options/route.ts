import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";

import { forwardIdentityRoute } from "../../../routeSupport";

export const POST = (request: NextRequest) => forwardIdentityRoute(request, {
  method: "POST",
  path: "/auth/step-up/passkey/options",
  responseSchema: identityApiTypes.schemas.PasskeyAuthenticationOptionsResult,
});
