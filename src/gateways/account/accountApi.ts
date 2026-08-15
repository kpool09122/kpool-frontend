import { accountApiTypes } from "@kpool/types";
import { z } from "zod";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

export type CreateAccountRequest = z.infer<typeof accountApiTypes.schemas.CreateAccountRequestBody>;
export type CreateAccountResult = z.infer<typeof accountApiTypes.schemas.CreateAccountResult>;
export type AccountSummary = z.infer<typeof accountApiTypes.schemas.AccountSummary>;
export type UpdateAccountRequest = z.infer<typeof accountApiTypes.schemas.UpdateAccountRequestBody>;
export type AccountDocumentUploadItem = z.infer<typeof accountApiTypes.schemas.AccountDocumentUploadItem>;
export type UploadAccountDocumentsRequest = z.infer<typeof accountApiTypes.schemas.UploadAccountDocumentsRequestBody>;
export type AccountDocumentSummary = z.infer<typeof accountApiTypes.schemas.AccountDocumentSummary>;
export type UploadAccountDocumentsResponse = z.infer<typeof accountApiTypes.schemas.UploadAccountDocumentsResponseBody>;
export type ListAccountDocumentsResponse = z.infer<typeof accountApiTypes.schemas.ListAccountDocumentsResponseBody>;
export type RequestAccountCategoryChangeRequest = z.infer<typeof accountApiTypes.schemas.RequestAccountCategoryChangeRequestBody>;
export type AccountCategoryChangeRequestSummary = z.infer<typeof accountApiTypes.schemas.AccountCategoryChangeRequestSummary>;
export type ListAccountCategoryChangeRequestsResponse = z.infer<typeof accountApiTypes.schemas.ListAccountCategoryChangeRequestsResponseBody>;
export type AccountCategoryChangeRequestDetailResponse = z.infer<typeof accountApiTypes.schemas.AccountCategoryChangeRequestDetailResponseBody>;
export type RejectAccountCategoryChangeRequest = z.infer<typeof accountApiTypes.schemas.RejectAccountCategoryChangeRequestBody>;
export type RequestAffiliationRequest = z.infer<typeof accountApiTypes.schemas.RequestAffiliationRequestBody>;
export type AffiliationSummary = z.infer<typeof accountApiTypes.schemas.AffiliationSummary>;

const InviteAccountMembersRequestSchema = z
  .object({
    accountIdentifier: z.string().uuid(),
    inviterPrincipalIdentifier: z.string().uuid(),
    emails: z.array(z.string().email()).min(1).max(50),
  })
  .passthrough();

export type InviteAccountMembersRequest = z.infer<typeof InviteAccountMembersRequestSchema>;
export type InvitationSummary = z.infer<typeof accountApiTypes.schemas.InvitationSummary>;
export type AccountMemberSummary = z.infer<typeof accountApiTypes.schemas.AccountMemberSummary>;
export type ListMembersResponse = z.infer<typeof accountApiTypes.schemas.ListMembersResponseBody>;
export type PrincipalGroupSummary = z.infer<typeof accountApiTypes.schemas.PrincipalGroupSummary>;
export type ListPrincipalGroupsResponse = z.infer<typeof accountApiTypes.schemas.ListPrincipalGroupsResponseBody>;
export type UpdatePrincipalGroupMembersRequest = z.infer<typeof accountApiTypes.schemas.UpdatePrincipalGroupMembersRequestBody>;

type AccountApiEnv = Record<string, string | undefined>;

const trimTrailingSlashes = (value: string): string => {
  let trimmedValue = value;

  while (trimmedValue.endsWith("/")) {
    trimmedValue = trimmedValue.slice(0, -1);
  }

  return trimmedValue;
};

export const withAccountApiPrefix = (baseUrl: string): string =>
  baseUrl.endsWith("/api/account")
    ? baseUrl
    : `${trimTrailingSlashes(baseUrl)}/api/account`;

export const getAccountApiBaseUrl = (
  env: AccountApiEnv = process.env,
): string | null =>
  env.KPOOL_ACCOUNT_API_BASE_URL
    ? withAccountApiPrefix(env.KPOOL_ACCOUNT_API_BASE_URL)
    : null;

export const parseCreateAccountRequest = (body: unknown): CreateAccountRequest =>
  parseWithSchemaLog("account create request", accountApiTypes.schemas.CreateAccountRequestBody, body);

export const parseCreateAccountResult = (body: unknown): CreateAccountResult =>
  parseWithSchemaLog("account create response", accountApiTypes.schemas.CreateAccountResult, Array.isArray(body) && body.length === 0 ? {} : body);

export const parseAccountSummary = (body: unknown): AccountSummary =>
  parseWithSchemaLog("account summary response", accountApiTypes.schemas.AccountSummary, body);

export const parseUpdateAccountRequest = (body: unknown): UpdateAccountRequest =>
  parseWithSchemaLog("account update request", accountApiTypes.schemas.UpdateAccountRequestBody, body);

export const parseUploadAccountDocumentsRequest = (body: unknown): UploadAccountDocumentsRequest =>
  parseWithSchemaLog("account documents upload request", accountApiTypes.schemas.UploadAccountDocumentsRequestBody, body);

export const parseUploadAccountDocumentsResponse = (body: unknown): UploadAccountDocumentsResponse =>
  parseWithSchemaLog("account documents upload response", accountApiTypes.schemas.UploadAccountDocumentsResponseBody, body);

export const parseListAccountDocumentsResponse = (body: unknown): ListAccountDocumentsResponse =>
  parseWithSchemaLog("account documents list response", accountApiTypes.schemas.ListAccountDocumentsResponseBody, body);

export const parseRequestAccountCategoryChangeRequest = (body: unknown): RequestAccountCategoryChangeRequest =>
  parseWithSchemaLog("account category change request", accountApiTypes.schemas.RequestAccountCategoryChangeRequestBody, body);

export const parseAccountCategoryChangeRequestSummary = (body: unknown): AccountCategoryChangeRequestSummary =>
  parseWithSchemaLog("account category change request response", accountApiTypes.schemas.AccountCategoryChangeRequestSummary, body);

export const parseListAccountCategoryChangeRequestsResponse = (body: unknown): ListAccountCategoryChangeRequestsResponse =>
  parseWithSchemaLog("account category change requests list response", accountApiTypes.schemas.ListAccountCategoryChangeRequestsResponseBody, body);

export const parseAccountCategoryChangeRequestDetailResponse = (body: unknown): AccountCategoryChangeRequestDetailResponse =>
  parseWithSchemaLog("account category change request detail response", accountApiTypes.schemas.AccountCategoryChangeRequestDetailResponseBody, body);

export const parseRejectAccountCategoryChangeRequest = (body: unknown): RejectAccountCategoryChangeRequest =>
  parseWithSchemaLog("account category change request reject request", accountApiTypes.schemas.RejectAccountCategoryChangeRequestBody, body);

export const parseRequestAffiliationRequest = (body: unknown): RequestAffiliationRequest =>
  parseWithSchemaLog("account affiliation request", accountApiTypes.schemas.RequestAffiliationRequestBody, body);

export const parseAffiliationSummary = (body: unknown): AffiliationSummary =>
  parseWithSchemaLog("account affiliation response", accountApiTypes.schemas.AffiliationSummary, body);

export const parseInviteAccountMembersRequest = (body: unknown): InviteAccountMembersRequest =>
  parseWithSchemaLog("account invite members request", InviteAccountMembersRequestSchema, body);

export const parseInvitationSummaries = (body: unknown): InvitationSummary[] =>
  parseWithSchemaLog("account invitation response", z.array(accountApiTypes.schemas.InvitationSummary), body);

export const parseAccountMembersResponse = (body: unknown): ListMembersResponse =>
  parseWithSchemaLog("account members response", accountApiTypes.schemas.ListMembersResponseBody, body);

export const parsePrincipalGroupsResponse = (body: unknown): ListPrincipalGroupsResponse =>
  parseWithSchemaLog("account principal groups response", accountApiTypes.schemas.ListPrincipalGroupsResponseBody, body);

export const parseUpdatePrincipalGroupMembersRequest = (body: unknown): UpdatePrincipalGroupMembersRequest =>
  parseWithSchemaLog("account principal group members update request", accountApiTypes.schemas.UpdatePrincipalGroupMembersRequestBody, body);
