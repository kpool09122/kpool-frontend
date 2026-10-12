import type { NextRequest } from "next/server";
import { proxySelfServiceCategoryChange } from "../selfServiceProxy";

type RouteContext = { params: Promise<{ accountId: string }> };
export async function GET(request: NextRequest, context: RouteContext) {
  const { accountId } = await context.params;
  return proxySelfServiceCategoryChange(request, accountId);
}
