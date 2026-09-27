import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { forwardIdentityRoute } from "../../routeSupport";

export async function POST(request: NextRequest) {
  return forwardIdentityRoute(request, {
    method: "POST",
    path: "/auth/passkeys/recovery",
    requestSchema: identityApiTypes.schemas.RecoverPasskeyRequestBody,
    responseSchema: z.void(),
  });
}
