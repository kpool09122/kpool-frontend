import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";

import { forwardIdentityRoute } from "../routeSupport";

export const GET = (request: NextRequest) => forwardIdentityRoute(request, {
  method: "GET",
  path: "/auth/passkeys",
  responseSchema: identityApiTypes.schemas.PasskeyListResult,
});
