import { monetizationApiTypes } from "@kpool/types";
import { z } from "zod";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { readApiErrorBody } from "@/gateways/support/apiError";
import type { MonetizationPrincipal } from "./monetizationPrincipal";

// Strip passthrough properties at the private browser boundary. Only masked fields cross it.
export const paymentCardSchema =
  monetizationApiTypes.schemas.PaymentMethodSummary.strip();
export const paymentCardsSchema = z.object({
  paymentMethods: z.array(paymentCardSchema),
});
export const completeCardSchema =
  monetizationApiTypes.schemas.RegisterPaymentMethodRequestBody.strict();
export const prepareCardSchema = monetizationApiTypes.monetizationApi.api
  .find(
    (endpoint) =>
      endpoint.alias === "PaymentMethodOperations_prepareCardRegistration",
  )!
  .response.strip()
  .extend({
    setupIntentIdentifier: z.string().regex(/^seti_[A-Za-z0-9]+$/),
    clientSecret: z.string().min(1),
  });
export type PaymentCard = z.infer<typeof paymentCardSchema>;
export type CardFailure = { ok: false; status: number; code?: string };
export type CardResult<T> = { ok: true; data: T } | CardFailure;
export const hasCardPermission = (
  principal: MonetizationPrincipal,
  accountIdentifier: string,
  action:
    | "payment_method_read"
    | "card_registration_prepare"
    | "payment_method_register"
    | "payment_method_delete",
) => {
  const matches = principal.policies
    .flatMap((p) => p.statements)
    .filter(
      (s) =>
        s.actions.includes(action) &&
        s.resourceTypes.includes("payment_method") &&
        (s.condition?.clauses ?? []).every(
          (c) =>
            c.field === "resource:accountId" &&
            (c.operator === "eq"
              ? c.value === accountIdentifier
              : c.operator === "ne"
                ? c.value !== accountIdentifier
                : c.operator === "in"
                  ? (Array.isArray(c.value) ? c.value : [c.value]).includes(
                      accountIdentifier,
                    )
                  : !(Array.isArray(c.value) ? c.value : [c.value]).includes(
                      accountIdentifier,
                    )),
        ),
    );
  return (
    principal.status === "active" &&
    matches.some((s) => s.effect === "allow") &&
    !matches.some((s) => s.effect === "deny")
  );
};
async function requestCard<T>(
  path: string,
  method: string,
  schema: z.ZodType<T>,
  body?: unknown,
  signal?: AbortSignal,
): Promise<CardResult<T>> {
  try {
    const response = await browserApiFetch(
      `/api/monetization/payment-methods${path}`,
      {
        method,
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal,
      },
    );
    const payload =
      response.status === 204 ? undefined : await readApiErrorBody(response);
    if (!response.ok)
      return {
        ok: false,
        status: response.status,
        ...(payload &&
        typeof payload === "object" &&
        "code" in payload &&
        typeof payload.code === "string"
          ? { code: payload.code }
          : {}),
      };
    const parsed = schema.safeParse(payload);
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, status: 502 };
  } catch {
    return { ok: false, status: 502 };
  }
}
export const paymentCardsApi = {
  list: (signal?: AbortSignal) =>
    requestCard("", "GET", paymentCardsSchema, undefined, signal),
  prepare: () => requestCard("/setup-intents", "POST", prepareCardSchema),
  complete: (setupIntentIdentifier: string) =>
    requestCard("", "POST", paymentCardSchema, { setupIntentIdentifier }),
  delete: (identifier: string) =>
    requestCard(`/${encodeURIComponent(identifier)}`, "DELETE", z.undefined()),
};
