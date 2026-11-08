import type { NextRequest } from "next/server";
import { forwardAnalyzePrincipal } from "../analyzeRouteSupport";
export const POST = (request: NextRequest) =>
  forwardAnalyzePrincipal(request, "post");
