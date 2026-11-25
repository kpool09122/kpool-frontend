import { z } from "zod";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import { snapshotSchemas, snapshotAccountPath, snapshotRequestPath } from "./accountSnapshotContract";
export { snapshotSchemas, snapshotAccountPath, snapshotRequestPath } from "./accountSnapshotContract";
export type { AccountSnapshot, SnapshotChange } from "./accountSnapshotContract";
const requestSnapshot = async <T extends z.ZodTypeAny>(path: string, locale: string, schema: T, method = "GET", body?: unknown, fetchAdapter = browserApiFetch): Promise<z.infer<T>> => {
  const response = await fetchAdapter(`/api/account/${path}`, {
    method, cache: "no-store", credentials: "include",
    headers: { Accept: "application/json", "Accept-Language": locale, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z.object({ message: z.string().optional(), code: z.string().optional() }).safeParse(data);
    throw Object.assign(new Error(error.success ? error.data.message ?? "Account request failed" : "Account request failed"), { accountRouteStatus: response.status, accountRouteCode: error.success ? error.data.code : undefined });
  }
  return parseWithSchemaLog("account snapshot response", schema, data);
};
export const fetchCurrentAccountSnapshot = async (id: string, locale: string, fetchAdapter = browserApiFetch) =>
  requestSnapshot(`${snapshotAccountPath(id)}/snapshot`, locale, snapshotSchemas.detail, "GET", undefined, fetchAdapter).catch((error: unknown) => {
    if (error instanceof Error && "accountRouteStatus" in error && error.accountRouteStatus === 404) return null;
    return Promise.reject(error);
  });
export const saveAccountSnapshot = (id: string, locale: string, fetchAdapter = browserApiFetch) => requestSnapshot(`${snapshotAccountPath(id)}/snapshot`, locale, snapshotSchemas.summary, "PUT", undefined, fetchAdapter);
export const fetchLatestSnapshotChange = (id: string, locale: string) => requestSnapshot(`${snapshotAccountPath(id)}/snapshot-change-requests/latest`, locale, snapshotSchemas.latest);
export const requestAccountSnapshotChange = async (id: string, locale: string, body: z.infer<typeof snapshotSchemas.changeBody>, fetchAdapter = browserApiFetch) => requestSnapshot(`${snapshotAccountPath(id)}/snapshot-change-requests`, locale, snapshotSchemas.change, "POST", parseWithSchemaLog("snapshot change body", snapshotSchemas.changeBody, body), fetchAdapter);
export const fetchSnapshotChanges = (locale: string, status: string, page: number) => requestSnapshot(`account-snapshot-change-requests?${new URLSearchParams({ status, page: String(page), perPage: "50" })}`, locale, snapshotSchemas.list);
export const fetchSnapshotComparison = (id: string, locale: string) => requestSnapshot(snapshotRequestPath(id), locale, snapshotSchemas.comparison);
export const reviewSnapshotChange = (id: string, locale: string, body?: z.infer<typeof snapshotSchemas.reviewBody>) => requestSnapshot(`${snapshotRequestPath(id)}/${body ? "reject" : "approve"}`, locale, snapshotSchemas.change, "POST", body ? parseWithSchemaLog("snapshot review body", snapshotSchemas.reviewBody, body) : undefined);
