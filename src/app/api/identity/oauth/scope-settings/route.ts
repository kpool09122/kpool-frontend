import type { NextRequest } from "next/server";
import {
  scopeSettingsSchema,
  emptySuccessSchema,
} from "@/gateways/identity/oauthConnectionsContract";
import { forwardOAuthRoute } from "../routeSupport";
export const GET = (request: NextRequest) =>
  forwardOAuthRoute(request, {
    method: "GET",
    path: "/oauth/scope-settings",
    responseSchema: scopeSettingsSchema,
  });
export const PUT = (request: NextRequest) =>
  forwardOAuthRoute(request, {
    method: "PUT",
    path: "/oauth/scope-settings",
    requestSchema: scopeSettingsSchema,
    responseSchema: emptySuccessSchema,
  });
