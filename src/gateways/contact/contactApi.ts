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
  identityIdentifier: z.string().uuid().nullable().optional(),
  category: contactCategorySchema,
  name: z.string(),
  email: z.string(),
  content: z.string(),
});

export type SubmitContactRequest = z.infer<typeof submitContactRequestSchema>;
export type SubmitContactResponse = z.infer<typeof submitContactResponseSchema>;

type SiteManagementApiEnv = Record<string, string | undefined>;

const trimTrailingSlashes = (value: string): string => {
  let trimmedValue = value;

  while (trimmedValue.endsWith("/")) {
    trimmedValue = trimmedValue.slice(0, -1);
  }

  return trimmedValue;
};

export const withSiteManagementApiPrefix = (baseUrl: string): string =>
  baseUrl.endsWith("/api/site-management")
    ? baseUrl
    : `${trimTrailingSlashes(baseUrl)}/api/site-management`;

export const getSiteManagementApiBaseUrl = (
  env: SiteManagementApiEnv = process.env,
): string | null =>
  env.KPOOL_SITE_MANAGEMENT_API_BASE_URL
    ? withSiteManagementApiPrefix(env.KPOOL_SITE_MANAGEMENT_API_BASE_URL)
    : null;

export const parseSubmitContactRequest = (body: unknown): SubmitContactRequest =>
  parseWithSchemaLog("contact submit request", submitContactRequestSchema, body);

export const parseSubmitContactResponse = (body: unknown): SubmitContactResponse =>
  parseWithSchemaLog("contact submit response", submitContactResponseSchema, body);
