import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";

import { forwardIdentityRoute } from "../../../../routeSupport";

export async function POST(request: NextRequest) {
  return forwardIdentityRoute(request, {
    method: "POST",
    path: "/auth/passkeys/recovery/email/verification",
    requestSchema: identityApiTypes.schemas.VerifyPasskeyRecoveryEmailRequestBody,
    responseSchema: identityApiTypes.schemas.PasskeyRecoveryVerificationResult,
  });
}
