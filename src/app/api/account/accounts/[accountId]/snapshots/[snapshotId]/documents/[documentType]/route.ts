import { type NextRequest } from "next/server";
import { proxySnapshot } from "@/app/api/account/snapshotProxy";
export async function GET(request: NextRequest, context: { params: Promise<{ accountId: string; snapshotId: string; documentType: string }> }) {
  const { accountId, snapshotId, documentType } = await context.params;
  return proxySnapshot(request, `accounts/${encodeURIComponent(accountId)}/snapshots/${encodeURIComponent(snapshotId)}/documents/${encodeURIComponent(documentType)}`, "document");
}
