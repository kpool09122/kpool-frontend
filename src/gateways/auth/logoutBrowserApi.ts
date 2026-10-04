import { requestIdentity } from "@/gateways/identity/identityBrowserRequest";

export const logoutFromIdentity = () => requestIdentity(
  "/api/identity/auth/logout",
  () => undefined,
);
