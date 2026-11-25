import { type NextRequest } from "next/server";
import { proxySnapshot } from "@/app/api/account/snapshotProxy";
import { snapshotSchemas } from "@/gateways/account/accountSnapshotContract";
export async function GET(request: NextRequest, context: { params: Promise<{ accountId: string; snapshotId: string }> }) {
  const { accountId, snapshotId } = await context.params;
  return proxySnapshot(request, `accounts/${encodeURIComponent(accountId)}/snapshots/${encodeURIComponent(snapshotId)}`, snapshotSchemas.detail);
}
