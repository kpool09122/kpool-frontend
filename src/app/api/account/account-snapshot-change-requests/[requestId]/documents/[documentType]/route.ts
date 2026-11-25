import { type NextRequest } from "next/server";
import { proxySnapshot } from "@/app/api/account/snapshotProxy";
export async function GET(request: NextRequest, context: { params: Promise<{ requestId: string; documentType: string }> }) {
  const { requestId, documentType } = await context.params;
  const source = new URL(request.url).searchParams.get("source") ?? "proposal";
  if (!["original", "proposal"].includes(source)) return Response.json({ message: "Invalid source." }, { status: 422 });
  return proxySnapshot(request, `account-snapshot-change-requests/${encodeURIComponent(requestId)}/documents/${encodeURIComponent(documentType)}?source=${source}`, "document");
}
