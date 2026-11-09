import type { NextRequest } from "next/server";
import { forwardAnalyzePrincipal } from "../../analyzeRouteSupport";
export const GET = (request: NextRequest) =>
  forwardAnalyzePrincipal(request, "get", "/app/regional-daily-summary");
