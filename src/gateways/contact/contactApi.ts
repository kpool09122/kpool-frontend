import { siteManagementPublicApiTypes } from "@kpool/types";
import { z } from "zod";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

export const contactCategorySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(99),
]);

export const submitContactRequestSchema = z.object({
  category: contactCategorySchema,
  name: z.string().min(1).max(32),
  email: z.string().email(),
  content: z.string().min(1).max(512),
});

export const submitContactResponseSchema = z.object({
  contactIdentifier: z.string().uuid(),
  principalIdentifier: z.string().uuid().nullable().optional(),
  category: contactCategorySchema,
  name: z.string(),
  email: z.string(),
  content: z.string(),
});

export type SubmitContactRequest = z.infer<typeof submitContactRequestSchema>;
export type SubmitContactResponse = z.infer<typeof submitContactResponseSchema>;

// Reuse the existing API models, stripping passthrough fields at the own-contact
// boundary so operator-only reply author data can never escape through this BFF.
const myContactSummarySchema = siteManagementPublicApiTypes.schemas.MyContactSummary.strip();
const myContactDetailSchema = siteManagementPublicApiTypes.schemas.ContactDetail.strip().extend({
  replies: z.array(siteManagementPublicApiTypes.schemas.ContactReplyDetail.strip()),
});
export type MyContactSummary = z.infer<typeof myContactSummarySchema>;
export type MyContactDetail = z.infer<typeof myContactDetailSchema>;

export const parseMyContactsResponse = (body: unknown): MyContactSummary[] =>
  parseWithSchemaLog("my contacts response", z.array(myContactSummarySchema), body);

export const parseMyContactDetailResponse = (body: unknown): MyContactDetail =>
  parseWithSchemaLog("my contact detail response", myContactDetailSchema, body);

type ContactApiEnv = Record<string, string | undefined>;

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, "");

export const withSiteManagementApiPrefix = (baseUrl: string): string => {
  const trimmedBaseUrl = trimTrailingSlashes(baseUrl);
  const prefix = "/api/v1/site-management";
  const legacyPrefix = "/api/site-management";

  if (trimmedBaseUrl.endsWith(prefix)) return trimmedBaseUrl;

  // Normalize configuration only; never retry or request a legacy endpoint.
  const origin = trimmedBaseUrl.endsWith(legacyPrefix)
    ? trimmedBaseUrl.slice(0, -legacyPrefix.length)
    : trimmedBaseUrl;

  return `${origin}${prefix}`;
};

export const getSiteManagementApiBaseUrl = (env: ContactApiEnv = process.env): string | null => {
  const baseUrl = env.KPOOL_SITE_MANAGEMENT_PUBLIC_API_BASE_URL
    ?? env.KPOOL_SITE_MANAGEMENT_API_BASE_URL
    ?? env.KPOOL_WIKI_PRIVATE_API_BASE_URL;

  return baseUrl ? withSiteManagementApiPrefix(baseUrl) : null;
};

export const parseSubmitContactRequest = (body: unknown): SubmitContactRequest =>
  parseWithSchemaLog("contact submit request", submitContactRequestSchema, body);

export const parseSubmitContactResponse = (body: unknown): SubmitContactResponse =>
  parseWithSchemaLog("contact submit response", submitContactResponseSchema, body);
