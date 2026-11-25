import { type NextRequest } from "next/server";
import { proxySnapshot } from "@/app/api/account/snapshotProxy";
import { snapshotSchemas } from "@/gateways/account/accountSnapshotContract";
export async function GET(request: NextRequest) {
  const input = new URL(request.url).searchParams;
  const status = input.get("status") ?? "pending";
  const page = Number(input.get("page") ?? "1");
  const perPage = Number(input.get("perPage") ?? "50");
  if (!["pending", "approved", "rejected"].includes(status) || !Number.isInteger(page) || page < 1 || !Number.isInteger(perPage) || perPage < 1 || perPage > 100) return Response.json({ message: "Invalid query." }, { status: 422 });
  return proxySnapshot(request, `account-snapshot-change-requests?${new URLSearchParams({ status, page: String(page), perPage: String(perPage) })}`, snapshotSchemas.list);
}
