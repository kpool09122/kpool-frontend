import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const StripeWebhookAcceptedResponseBody = z
  .object({ status: z.literal("accepted") })
  .passthrough();
const StripeWebhookIgnoredResponseBody = z
  .object({ status: z.literal("ignored") })
  .passthrough();
const StripeWebhookInvalidSignatureResponseBody = z
  .object({ error: z.literal("Invalid signature") })
  .passthrough();

export const schemas = {
  StripeWebhookAcceptedResponseBody,
  StripeWebhookIgnoredResponseBody,
  StripeWebhookInvalidSignatureResponseBody,
};

const endpoints = makeApi([
  {
    method: "post",
    path: "/stripe",
    alias: "StripeWebhookOperations_receiveStripeWebhook",
    description: `Receive Stripe account external account webhook events.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.unknown(),
      },
      {
        name: "Stripe-Signature",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.union([
      StripeWebhookAcceptedResponseBody,
      StripeWebhookIgnoredResponseBody,
    ]),
    errors: [
      {
        status: 400,
        description: `400 response for Stripe webhook requests with an invalid signature.`,
        schema: StripeWebhookInvalidSignatureResponseBody,
      },
    ],
  },
]);

export const webhookApi = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
