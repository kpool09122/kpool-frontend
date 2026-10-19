import { z } from "zod";
import { browserApiFetch } from "./browserApiFetch";
import { getApiErrorMessage, readApiErrorBody } from "./apiError";

export type PrincipalAccessRefresh = (
  status?: number | null,
) => Promise<boolean | null>;
export type PrincipalGroupTransport<G, U, P> = {
  fetchList: () => Promise<{ groups: G[]; users: U[] }>;
  saveList: (payload: P) => Promise<{
    committed: true;
    refresh:
      | { ok: true; data: { groups: G[]; users: U[] } }
      | { ok: false; status: number; message: string };
  }>;
};
export const principalGroupApiError = (
  status: number,
  body: unknown,
  fallback: string,
) =>
  Object.assign(new Error(getApiErrorMessage(body, fallback)), {
    status,
    code:
      body && typeof body === "object" && "code" in body
        ? body.code
        : undefined,
  });
export const saveResultSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    committed: z.literal(true),
    refresh: z.discriminatedUnion("ok", [
      z.object({ ok: z.literal(true), data: schema }),
      z.object({
        ok: z.literal(false),
        status: z.number(),
        message: z.string(),
      }),
    ]),
  });
export const savePrincipalGroupRequest = async <T extends z.ZodTypeAny>({
  url,
  body,
  dataSchema,
  fallback,
  fetchAdapter = browserApiFetch,
}: {
  url: string;
  body: unknown;
  dataSchema: T;
  fallback: string;
  fetchAdapter?: typeof fetch;
}) => {
  const response = await fetchAdapter(url, {
    method: "PATCH",
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const value = await readApiErrorBody(response);
  if (!response.ok)
    throw principalGroupApiError(response.status, value, fallback);
  const result = saveResultSchema(dataSchema).safeParse(value);
  return result.success
    ? result.data
    : {
        committed: true as const,
        refresh: { ok: false as const, status: 502, message: fallback },
      };
};
