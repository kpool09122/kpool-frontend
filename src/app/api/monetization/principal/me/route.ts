import type { NextRequest } from "next/server";
import { principalSchema } from "@/gateways/monetization/monetizationPrincipal";
import { forwardMonetization } from "../../routeSupport";
export const GET = (request: NextRequest) => forwardMonetization(request, "/principal/me", principalSchema);
