import { type NextRequest } from "next/server";
import { proxySnapshot } from "@/app/api/account/snapshotProxy";
import { snapshotSchemas } from "@/gateways/account/accountSnapshotContract";
export async function GET(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await context.params;
  return proxySnapshot(request, `account-snapshot-change-requests/${encodeURIComponent(requestId)}`, snapshotSchemas.comparison);
}
