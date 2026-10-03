import { requestIdentity, type IdentityBrowserApiResult } from "./identityBrowserRequest";

export const withdrawFromService = (): Promise<IdentityBrowserApiResult<Record<string, never>>> =>
  requestIdentity(
    "/api/identity",
    () => ({}),
    { method: "DELETE" },
  );
