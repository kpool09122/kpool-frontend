import type { NextRequest } from "next/server";
import { proxySelfServiceCategoryChange } from "../../selfServiceProxy";

type RouteContext = {
  params: Promise<{ accountId: string; requestId: string }>;
};
export async function POST(request: NextRequest, context: RouteContext) {
  const { accountId, requestId } = await context.params;
  return proxySelfServiceCategoryChange(request, accountId, requestId);
}
