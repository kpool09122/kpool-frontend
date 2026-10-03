import { identityApiTypes } from "@kpool/types";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

import { requestIdentity, type IdentityBrowserApiResult } from "./identityBrowserRequest";

export const withdrawFromService = (confirmationIdentityName: string): Promise<IdentityBrowserApiResult<Record<string, never>>> =>
  requestIdentity(
    "/api/identity",
    () => ({}),
    { method: "DELETE", body: { confirmationIdentityName } },
  );

export const getWithdrawalEligibility = () => requestIdentity(
  "/api/identity/withdrawal-eligibility",
  (body) => parseWithSchemaLog("withdrawal eligibility response", identityApiTypes.schemas.WithdrawalEligibility, body),
  { method: "GET" },
);
