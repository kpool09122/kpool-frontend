import { identityApiTypes } from "@kpool/types";
import type { NextRequest } from "next/server";

import { forwardIdentityRoute } from "@/app/api/identity/auth/routeSupport";

export async function GET(request: NextRequest) {
  const response = await forwardIdentityRoute(request, {
    method: "GET",
    path: "/auth/social/link",
    responseSchema: identityApiTypes.schemas.SocialLinkingResult,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
