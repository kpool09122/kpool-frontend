import { siteManagementApiTypes } from "@kpool/types";
import { z } from "zod";

import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

// Backend #747 includes submitter replies without a mail sentAt timestamp.
// Keep the generated contract untouched and accept both deployed reply formats.
const contactDetailSchema = siteManagementApiTypes.schemas.ContactDetail.extend({
  replies: z.array(siteManagementApiTypes.schemas.ContactReplyDetail.extend({
    sentAt: z.string().nullable(),
    createdAt: z.string().optional(),
  })),
});

export type SiteManagementContactDetail = z.infer<typeof contactDetailSchema>;
export type SiteManagementContactsPage = z.infer<typeof siteManagementApiTypes.schemas.ListContactsPage>;

export const siteManagementContactsUnavailableMessage = "SiteManagement contacts are unavailable.";

const contactError = (status: number): Error & { status: number } =>
  Object.assign(new Error(siteManagementContactsUnavailableMessage), { status });

export const parseSiteManagementContactsPage = (body: unknown): SiteManagementContactsPage =>
  parseWithSchemaLog("site management contacts", siteManagementApiTypes.schemas.ListContactsPage, body);

export const parseSiteManagementContactDetail = (body: unknown): SiteManagementContactDetail =>
  parseWithSchemaLog("site management contact detail", contactDetailSchema, body);

export const fetchSiteManagementContacts = async ({
  page,
  perPage = 50,
  unansweredOnly = true,
  fetchAdapter = browserApiFetch,
}: {
  page: number;
  perPage?: number;
  unansweredOnly?: boolean;
  fetchAdapter?: typeof fetch;
}): Promise<SiteManagementContactsPage> => {
  const filter = unansweredOnly ? "hasReply=0&" : "";
  const response = await fetchAdapter(`/api/site-management/contacts?${filter}page=${page}&perPage=${perPage}`, {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw contactError(response.status);
  return parseSiteManagementContactsPage(await response.json());
};

export const fetchSiteManagementContactDetail = async ({
  contactIdentifier,
  fetchAdapter = browserApiFetch,
}: {
  contactIdentifier: string;
  fetchAdapter?: typeof fetch;
}): Promise<SiteManagementContactDetail> => {
  const response = await fetchAdapter(`/api/site-management/contacts/${encodeURIComponent(contactIdentifier)}`, {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw contactError(response.status);
  return parseSiteManagementContactDetail(await response.json());
};

export const replyToSiteManagementContact = async ({
  contactIdentifier,
  content,
  fetchAdapter = browserApiFetch,
}: {
  contactIdentifier: string;
  content: string;
  fetchAdapter?: typeof fetch;
}): Promise<void> => {
  const response = await fetchAdapter(`/api/site-management/contacts/${encodeURIComponent(contactIdentifier)}/replies`, {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw contactError(response.status);
};
