import { siteManagementApiTypes } from "@kpool/types";
import { z } from "zod";

import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

export type SiteManagementContactDetail = z.infer<typeof siteManagementApiTypes.schemas.ContactDetail>;
export type SiteManagementContactsPage = z.infer<typeof siteManagementApiTypes.schemas.ListContactsPage>;

export const siteManagementContactsUnavailableMessage = "SiteManagement contacts are unavailable.";

const contactError = (status: number): Error & { status: number } =>
  Object.assign(new Error(siteManagementContactsUnavailableMessage), { status });

export const parseSiteManagementContactsPage = (body: unknown): SiteManagementContactsPage =>
  parseWithSchemaLog("site management contacts", siteManagementApiTypes.schemas.ListContactsPage, body);

export const parseSiteManagementContactDetail = (body: unknown): SiteManagementContactDetail =>
  parseWithSchemaLog("site management contact detail", siteManagementApiTypes.schemas.ContactDetail, body);

export const fetchSiteManagementContacts = async ({
  page,
  perPage = 50,
  fetchAdapter = browserApiFetch,
}: {
  page: number;
  perPage?: number;
  fetchAdapter?: typeof fetch;
}): Promise<SiteManagementContactsPage> => {
  const response = await fetchAdapter(`/api/site-management/contacts?hasReply=0&page=${page}&perPage=${perPage}`, {
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
