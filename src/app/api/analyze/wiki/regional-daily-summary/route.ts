import type { NextRequest } from "next/server";
import { forwardAnalyzePrincipal } from "../../analyzeRouteSupport";
export const GET = (request: NextRequest) =>
  forwardAnalyzePrincipal(request, "get", "/wiki/regional-daily-summary");
