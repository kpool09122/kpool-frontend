import { siteManagementApiTypes } from "@kpool/types";
import { z } from "zod";

import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

export type SiteManagementContactDetail = z.infer<typeof siteManagementApiTypes.schemas.OperatorContactDetail>;
export type SiteManagementContactsPage = z.infer<typeof siteManagementApiTypes.schemas.ListContactsPage>;
export const siteManagementContactSenderFilterSchema = z.array(z.string().uuid()).max(1);

export const siteManagementContactsUnavailableMessage = "SiteManagement contacts are unavailable.";

const contactError = (status: number): Error & { status: number } =>
  Object.assign(new Error(siteManagementContactsUnavailableMessage), { status });

export const parseSiteManagementContactsPage = (body: unknown): SiteManagementContactsPage =>
  parseWithSchemaLog("site management contacts", siteManagementApiTypes.schemas.ListContactsPage, body);

export const parseSiteManagementContactDetail = (body: unknown): SiteManagementContactDetail =>
  parseWithSchemaLog("site management contact detail", siteManagementApiTypes.schemas.OperatorContactDetail, body);

export const fetchSiteManagementContacts = async ({
  page,
  hasReply,
  principalIdentifier,
  perPage = 50,
  fetchAdapter = browserApiFetch,
}: {
  page: number;
  hasReply?: "0" | "1";
  principalIdentifier?: string;
  perPage?: number;
  fetchAdapter?: typeof fetch;
}): Promise<SiteManagementContactsPage> => {
  const senderFilter = siteManagementContactSenderFilterSchema.safeParse(principalIdentifier === undefined ? [] : [principalIdentifier]);
  if (!senderFilter.success) throw contactError(422);
  const params = new URLSearchParams();
  if (hasReply !== undefined) params.set("hasReply", hasReply);
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  if (principalIdentifier !== undefined) params.set("principalIdentifier", principalIdentifier);
  const response = await fetchAdapter(`/api/site-management/contacts?${params.toString()}`, {
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
