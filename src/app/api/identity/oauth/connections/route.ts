import type { NextRequest } from "next/server";
import { connectionListSchema } from "@/gateways/identity/oauthConnectionsContract";
import { forwardOAuthRoute } from "../routeSupport";
export const GET = (request: NextRequest) =>
  forwardOAuthRoute(request, {
    method: "GET",
    path: "/oauth/connections",
    responseSchema: connectionListSchema,
  });
