import { siteManagementApiTypes } from "@kpool/types";
import { z } from "zod";

import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

// Reply author and sequence metadata determine who last responded, independently of mail delivery.
const contactReplySchema = siteManagementApiTypes.schemas.ContactReplyDetail.extend({
  replyNumber: z.number().int().positive(),
  principalIdentifier: z.string().nullable(),
  name: z.string().nullable(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
});
const contactDetailSchema = siteManagementApiTypes.schemas.ContactDetail.extend({ replies: z.array(contactReplySchema) });
const contactSummarySchema = siteManagementApiTypes.schemas.MyContactSummary.extend({ replies: z.array(contactReplySchema) });
const contactsPageSchema = siteManagementApiTypes.schemas.ListContactsPage.extend({ contacts: z.array(contactSummarySchema) });

export type SiteManagementContactDetail = z.infer<typeof contactDetailSchema>;
export type SiteManagementContactsPage = z.infer<typeof contactsPageSchema>;

export const hasLatestReplyFromPrincipal = (
  contact: Pick<SiteManagementContactsPage["contacts"][number], "replies">,
  principalIdentifier: string | null | undefined,
): boolean => {
  const latest = contact.replies.reduce<z.infer<typeof contactReplySchema> | null>(
    (current, item) => !current || item.replyNumber > current.replyNumber ? item : current,
    null,
  );
  return !!principalIdentifier && latest?.principalIdentifier === principalIdentifier;
};

export const siteManagementContactsUnavailableMessage = "SiteManagement contacts are unavailable.";

const contactError = (status: number): Error & { status: number } =>
  Object.assign(new Error(siteManagementContactsUnavailableMessage), { status });

export const parseSiteManagementContactsPage = (body: unknown): SiteManagementContactsPage =>
  parseWithSchemaLog("site management contacts", contactsPageSchema, body);

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
  const filter = unansweredOnly ? "replyStatus=pending&" : "";
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
