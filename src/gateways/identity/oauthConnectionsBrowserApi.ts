import type { ZodType } from "zod";
import { requestIdentity } from "./identityBrowserRequest";
import {
  connectionListSchema,
  emptySuccessSchema,
  scopeSettingsSchema,
  type ScopeSettings,
} from "./oauthConnectionsContract";
const base = "/api/identity/oauth";
const parseResponse = <T>(schema: ZodType<T>, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) throw new Error("Invalid OAuth management response");
  return result.data;
};
// Do not log schema payloads: a malformed upstream response might contain credentials.
export const oauthConnectionsBrowserApi = {
  settings: (language?: string) =>
    requestIdentity(
      `${base}/scope-settings`,
      (body) => parseResponse(scopeSettingsSchema, body),
      { method: "GET", language },
    ),
  save: (scopes: ScopeSettings["scopes"], language?: string) =>
    requestIdentity(
      `${base}/scope-settings`,
      (body) => parseResponse(emptySuccessSchema, body),
      { method: "PUT", body: { scopes }, language },
    ),
  list: (language?: string) =>
    requestIdentity(
      `${base}/connections`,
      (body) => parseResponse(connectionListSchema, body),
      { method: "GET", language },
    ),
  revoke: (id: string, language?: string) =>
    requestIdentity(
      `${base}/connections/${encodeURIComponent(id)}`,
      (body) => parseResponse(emptySuccessSchema, body),
      { method: "DELETE", language },
    ),
};
export type OAuthConnectionsBrowserApi = typeof oauthConnectionsBrowserApi;
