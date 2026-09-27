import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";

import { forwardIdentityRoute } from "@/app/api/identity/auth/routeSupport";

export async function POST(request: NextRequest) {
  const response = await forwardIdentityRoute(request, {
    method: "POST",
    path: "/auth/social/link/email",
    responseSchema: identityApiTypes.schemas.SendSocialLinkingEmailResult,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
