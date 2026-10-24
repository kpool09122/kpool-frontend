import { siteManagementApiTypes } from "@kpool/types";
import { z } from "zod";

import { contactReplyCompatibilitySchema } from "@/gateways/contact/contactApi";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

const operatorContactReplyCompatibilitySchema = siteManagementApiTypes.schemas.OperatorContactReplyDetail.extend({
  ...contactReplyCompatibilitySchema.pick({ replyType: true, createdAt: true }).shape,
  principalIdentifier: z.string().uuid().nullish(),
  name: siteManagementApiTypes.schemas.OperatorContactReplyDetail.shape.name.optional(),
});
const siteManagementContactDetailSchema = siteManagementApiTypes.schemas.OperatorContactDetail.extend({
  replies: z.array(operatorContactReplyCompatibilitySchema),
});
export type SiteManagementContactDetail = z.infer<typeof siteManagementContactDetailSchema>;
export type SiteManagementContactsPage = z.infer<typeof siteManagementApiTypes.schemas.ListContactsPage>;
export const siteManagementContactSenderFilterSchema = z.array(z.string().uuid()).max(1);
export const siteManagementContactPendingFilterSchema = z.array(z.enum(["0", "1"])).max(1);

export const siteManagementContactsUnavailableMessage = "SiteManagement contacts are unavailable.";

const contactError = (status: number): Error & { status: number } =>
  Object.assign(new Error(siteManagementContactsUnavailableMessage), { status });

export const parseSiteManagementContactsPage = (body: unknown): SiteManagementContactsPage =>
  parseWithSchemaLog("site management contacts", siteManagementApiTypes.schemas.ListContactsPage, body);

export const parseSiteManagementContactDetail = (body: unknown): SiteManagementContactDetail =>
  parseWithSchemaLog("site management contact detail", siteManagementContactDetailSchema, body);

export const fetchSiteManagementContacts = async ({
  page,
  isPending,
  principalIdentifier,
  perPage = 50,
  fetchAdapter = browserApiFetch,
}: {
  page: number;
  isPending?: "0" | "1";
  principalIdentifier?: string;
  perPage?: number;
  fetchAdapter?: typeof fetch;
}): Promise<SiteManagementContactsPage> => {
  const senderFilter = siteManagementContactSenderFilterSchema.safeParse(principalIdentifier === undefined ? [] : [principalIdentifier]);
  if (!senderFilter.success) throw contactError(422);
  const params = new URLSearchParams();
  if (!siteManagementContactPendingFilterSchema.safeParse(isPending === undefined ? [] : [isPending]).success) throw contactError(422);
  if (isPending !== undefined) params.set("isPending", isPending);
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
