import { z } from "zod";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
const key = "kpool:payment-card-recovery";
const operationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("prepare") }),
  z.object({
    kind: z.literal("complete"),
    identifier: z.string().regex(/^seti_[A-Za-z0-9]+$/),
  }),
  z.object({ kind: z.literal("delete"), identifier: z.string().uuid() }),
]);
export type CardOperation = z.infer<typeof operationSchema>;
const recoverySchema = z.object({
  scope: z.string(),
  operation: operationSchema,
  expires: z.number(),
  redirect: z.boolean(),
});
export const paymentCardScope = (identity: AuthenticatedIdentitySummary) =>
  JSON.stringify([
    identity.identityIdentifier,
    getAccountIdentifierFromIdentity(identity),
    identity.accountPrincipalIdentifier,
    identity.delegationIdentifier ?? null,
  ]);
// Only a short-lived, non-secret operation reference survives a social step-up redirect.
// Restoration always requires an explicit user action; it never authorizes an API call.
export function saveCardRecovery(scope: string, operation: CardOperation) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        scope,
        operation,
        expires: Date.now() + 600000,
        redirect: true,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
export function readCardRecovery(scope: string) {
  try {
    const parsed = recoverySchema.safeParse(
      JSON.parse(sessionStorage.getItem(key) ?? "null"),
    );
    if (
      !parsed.success ||
      parsed.data.expires < Date.now() ||
      parsed.data.scope !== scope
    ) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}
export function consumeCardRecoveryRedirect(scope: string) {
  const recovery = readCardRecovery(scope);
  if (!recovery?.redirect) return false;
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ ...recovery, redirect: false }),
    );
    return true;
  } catch {
    return false;
  }
}
export function clearCardRecovery() {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Storage is optional outside social redirect recovery. */
  }
}
