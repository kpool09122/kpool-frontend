import { type NextRequest } from "next/server";
import { proxySnapshot } from "@/app/api/account/snapshotProxy";
import { snapshotSchemas } from "@/gateways/account/accountSnapshotContract";
export async function POST(request: NextRequest, context: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await context.params;
  return proxySnapshot(request, `accounts/${encodeURIComponent(accountId)}/snapshot-change-requests`, snapshotSchemas.change, snapshotSchemas.changeBody);
}
