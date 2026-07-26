import { accountApiTypes } from "@kpool/types";
import { z } from "zod";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

export type CreateAccountRequest = z.infer<typeof accountApiTypes.schemas.CreateAccountRequestBody>;
export type CreateAccountResult = z.infer<typeof accountApiTypes.schemas.CreateAccountResult>;
export type AccountSummary = z.infer<typeof accountApiTypes.schemas.AccountSummary>;
export type UpdateAccountRequest = z.infer<typeof accountApiTypes.schemas.UpdateAccountRequestBody>;

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
