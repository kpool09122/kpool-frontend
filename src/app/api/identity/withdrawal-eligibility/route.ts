import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";

import { forwardIdentityRoute } from "../auth/routeSupport";

export const GET = (request: NextRequest) => forwardIdentityRoute(request, {
  method: "GET",
  path: "/identities/me/withdrawal-eligibility",
  responseSchema: identityApiTypes.schemas.WithdrawalEligibility,
});
