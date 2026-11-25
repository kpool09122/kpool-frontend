import { type NextRequest } from "next/server";
import { proxySnapshot } from "@/app/api/account/snapshotProxy";
import { snapshotSchemas } from "@/gateways/account/accountSnapshotContract";
export async function GET(request: NextRequest, context: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await context.params;
  return proxySnapshot(request, `accounts/${encodeURIComponent(accountId)}/snapshot`, snapshotSchemas.detail);
}
export async function PUT(request: NextRequest, context: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await context.params;
  return proxySnapshot(request, `accounts/${encodeURIComponent(accountId)}/snapshot`, snapshotSchemas.summary);
}
