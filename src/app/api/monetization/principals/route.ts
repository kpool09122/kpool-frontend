import type { NextRequest } from "next/server";
import { createdPrincipalSchema } from "@/gateways/monetization/monetizationPrincipal";
import { forwardMonetization } from "../routeSupport";
export const POST = (request: NextRequest) => forwardMonetization(request, "/principals", createdPrincipalSchema, "POST");
