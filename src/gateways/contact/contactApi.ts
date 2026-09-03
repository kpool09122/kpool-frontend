import { siteManagementPublicApiTypes } from "@kpool/types";
import { z } from "zod";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

export type MyContactSummary = z.infer<typeof siteManagementPublicApiTypes.schemas.MyContactSummary>;
export type MyContactDetail = z.infer<typeof siteManagementPublicApiTypes.schemas.ContactDetail>;

type ContactApiEnv = Record<string, string | undefined>;

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, "");

export const withSiteManagementApiPrefix = (baseUrl: string): string =>
  baseUrl.endsWith("/api/site-management")
    ? baseUrl
    : `${trimTrailingSlashes(baseUrl)}/api/site-management`;

export const getSiteManagementApiBaseUrl = (env: ContactApiEnv = process.env): string | null =>
  (env.KPOOL_SITE_MANAGEMENT_PUBLIC_API_BASE_URL ?? env.KPOOL_WIKI_PRIVATE_API_BASE_URL)
    ? withSiteManagementApiPrefix(env.KPOOL_SITE_MANAGEMENT_PUBLIC_API_BASE_URL ?? env.KPOOL_WIKI_PRIVATE_API_BASE_URL!)
    : null;

export const parseMyContactsResponse = (body: unknown): MyContactSummary[] =>
  parseWithSchemaLog("my contacts response", z.array(siteManagementPublicApiTypes.schemas.MyContactSummary), body);

export const parseMyContactDetailResponse = (body: unknown): MyContactDetail =>
  parseWithSchemaLog("my contact detail response", siteManagementPublicApiTypes.schemas.ContactDetail, body);
