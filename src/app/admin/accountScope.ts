import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";

export const getAdminAccountScope = (identity: AuthenticatedIdentitySummary): string =>
  JSON.stringify([
    identity.identityIdentifier,
    getAccountIdentifierFromIdentity(identity),
    identity.accountPrincipalIdentifier ?? null,
    identity.delegationIdentifier ?? null,
  ]);
