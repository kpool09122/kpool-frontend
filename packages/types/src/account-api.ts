import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const KPool_Common_Uuid = z.string();
const KPool_Common_Timestamp = z.string();
const VerificationRejectionReasonSummary = z
  .object({ code: z.string(), detail: z.string().nullish() })
  .passthrough();
const ContactAddressSummary = z
  .object({
    countryCode: z.string().nullable(),
    administrativeAreaCode: z.string().nullable(),
    postalCode: z.string().nullable(),
    locality: z.string().nullable(),
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
  })
  .partial()
  .passthrough();
const AccountSummary = z
  .object({
    accountIdentifier: KPool_Common_Uuid,
    email: z.string(),
    type: z.string(),
    name: z.string(),
    status: z.string(),
    accountCategory: z.string(),
    phone: z.string().nullish(),
    address: ContactAddressSummary.nullish(),
  })
  .passthrough();
const AccountCategoryChangeRequestListItemSummary = z
  .object({
    requestIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
    currentAccountCategory: z.string(),
    requestedAccountCategory: z.string(),
    status: z.string(),
    requestedAt: KPool_Common_Timestamp,
    reviewedBy: KPool_Common_Uuid.nullish(),
    reviewedAt: KPool_Common_Timestamp.nullish(),
    rejectionReason: VerificationRejectionReasonSummary.nullish(),
    account: AccountSummary,
  })
  .passthrough();
const ListAccountCategoryChangeRequestsResponseBody = z
  .object({
    requests: z.array(AccountCategoryChangeRequestListItemSummary),
    current_page: z.number().int(),
    last_page: z.number().int(),
    total: z.number().int(),
    per_page: z.number().int(),
  })
  .passthrough();
const KPool_Common_ProblemDetails = z
  .object({
    type: z.string(),
    status: z.number().int(),
    title: z.string(),
    detail: z.string(),
    instance: z.string(),
  })
  .partial()
  .passthrough();
const AccountCategoryChangeRequestSummary = z
  .object({
    requestIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
    currentAccountCategory: z.string(),
    requestedAccountCategory: z.string(),
    status: z.string(),
    requestedAt: KPool_Common_Timestamp,
    reviewedBy: KPool_Common_Uuid.nullish(),
    reviewedAt: KPool_Common_Timestamp.nullish(),
    rejectionReason: VerificationRejectionReasonSummary.nullish(),
  })
  .passthrough();
const AccountCategoryChangeRequestIdentitySummary = z
  .object({ name: z.string(), email: z.string() })
  .passthrough();
const AccountDocumentSummary = z
  .object({
    documentType: z.string(),
    documentPath: z.string(),
    uploadedAt: KPool_Common_Timestamp,
  })
  .passthrough();
const AccountCategoryChangeRequestDetailResponseBody = z
  .object({
    request: AccountCategoryChangeRequestSummary,
    account: AccountSummary,
    identities: z.array(AccountCategoryChangeRequestIdentitySummary),
    documents: z.array(AccountDocumentSummary),
  })
  .passthrough();
const RejectAccountCategoryChangeRequestBody = z
  .object({
    rejectionReasonCode: z.enum([
      "document_unclear",
      "document_expired",
      "document_mismatch",
      "document_incomplete",
      "fraudulent_document",
      "other",
    ]),
    rejectionReasonDetail: z.string().nullish(),
  })
  .passthrough();
const CreateAccountRequestBody = z
  .object({
    email: z.string(),
    accountType: z.string(),
    accountName: z.string(),
    principalIdentifier: KPool_Common_Uuid.nullish(),
    phone: z.string().nullish(),
    address: ContactAddressSummary.nullish(),
  })
  .passthrough();
const CreateAccountResult = z
  .object({
    accountIdentifier: KPool_Common_Uuid,
    email: z.string(),
    type: z.string(),
    name: z.string(),
    status: z.string(),
    accountCategory: z.string(),
    phone: z.string().nullable(),
    address: ContactAddressSummary.nullable(),
  })
  .partial()
  .passthrough();
const RequestAccountCategoryChangeRequestBody = z
  .object({ requestedAccountCategory: z.enum(["agency", "talent", "general"]) })
  .passthrough();
const UpdateAccountRequestBody = z
  .object({
    accountName: z.string(),
    phone: z.string().nullish(),
    address: ContactAddressSummary.nullish(),
  })
  .passthrough();
const AccountDocumentUploadItem = z
  .object({ documentType: z.string(), fileContents: z.string() })
  .passthrough();
const UploadAccountDocumentsRequestBody = z
  .object({ documents: z.array(AccountDocumentUploadItem) })
  .passthrough();
const UploadAccountDocumentsResponseBody = z
  .object({ documents: z.array(AccountDocumentSummary) })
  .passthrough();
const AffiliationTermsSummary = z
  .object({
    revenueSharePercentage: z.number().int(),
    contractNotes: z.string(),
  })
  .partial()
  .passthrough();
const RequestAffiliationRequestBody = z
  .object({ targetEmail: z.string(), terms: AffiliationTermsSummary.nullish() })
  .passthrough();
const AffiliationSummary = z
  .object({
    affiliationIdentifier: KPool_Common_Uuid,
    agencyAccountIdentifier: KPool_Common_Uuid,
    talentAccountIdentifier: KPool_Common_Uuid,
    requestedBy: KPool_Common_Uuid,
    status: z.string(),
    terms: AffiliationTermsSummary.nullish(),
    requestedAt: KPool_Common_Timestamp,
    activatedAt: KPool_Common_Timestamp.nullish(),
    terminatedAt: KPool_Common_Timestamp.nullish(),
  })
  .passthrough();
const TerminateAffiliationRequestBody = z
  .object({ terminatorAccountIdentifier: KPool_Common_Uuid })
  .passthrough();
const GrantDelegationPermissionRequestBody = z
  .object({
    principalGroupIdentifier: KPool_Common_Uuid,
    targetAccountIdentifier: KPool_Common_Uuid,
    affiliationIdentifier: KPool_Common_Uuid,
  })
  .passthrough();
const DelegationPermissionSummary = z
  .object({
    delegationPermissionIdentifier: KPool_Common_Uuid,
    principalGroupIdentifier: KPool_Common_Uuid,
    targetAccountIdentifier: KPool_Common_Uuid,
    affiliationIdentifier: KPool_Common_Uuid,
    createdAt: KPool_Common_Timestamp,
  })
  .passthrough();
const RequestDelegationRequestBody = z
  .object({
    affiliationIdentifier: KPool_Common_Uuid,
    delegateIdentifier: KPool_Common_Uuid,
    delegatorIdentifier: KPool_Common_Uuid,
  })
  .passthrough();
const DelegationSummary = z
  .object({
    delegationIdentifier: KPool_Common_Uuid,
    affiliationIdentifier: KPool_Common_Uuid,
    delegateIdentifier: KPool_Common_Uuid,
    delegatorIdentifier: KPool_Common_Uuid,
    status: z.string(),
    direction: z.string(),
    requestedAt: KPool_Common_Timestamp,
    approvedAt: KPool_Common_Timestamp.nullish(),
    revokedAt: KPool_Common_Timestamp.nullish(),
  })
  .passthrough();
const ApproveDelegationRequestBody = z
  .object({ approverIdentifier: KPool_Common_Uuid })
  .passthrough();
const RevokeDelegationRequestBody = z
  .object({ revokerIdentifier: KPool_Common_Uuid })
  .passthrough();
const InviteMemberRequestBody = z
  .object({
    accountIdentifier: KPool_Common_Uuid,
    inviterPrincipalIdentifier: KPool_Common_Uuid,
    emails: z.array(z.string()),
  })
  .passthrough();
const InvitationSummary = z
  .object({
    invitationIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
    invitedByPrincipalIdentifier: KPool_Common_Uuid,
    email: z.string(),
    token: z.string(),
    status: z.string(),
    expiresAt: KPool_Common_Timestamp,
    createdAt: KPool_Common_Timestamp,
  })
  .passthrough();
const MemberPrincipalGroupSummary = z
  .object({
    principalGroupIdentifier: KPool_Common_Uuid,
    name: z.string(),
    isDefault: z.boolean(),
  })
  .passthrough();
const AccountMemberSummary = z
  .object({
    principalIdentifier: KPool_Common_Uuid,
    identityIdentifier: KPool_Common_Uuid,
    identityName: z.string(),
    email: z.string(),
    principalGroups: z.array(MemberPrincipalGroupSummary),
  })
  .passthrough();
const ListMembersResponseBody = z
  .object({ members: z.array(AccountMemberSummary) })
  .passthrough();
const ListAccountDocumentsResponseBody = z
  .object({ documents: z.array(AccountDocumentSummary) })
  .passthrough();
const PrincipalGroupMemberSummary = z
  .object({
    principalIdentifier: KPool_Common_Uuid,
    identityIdentifier: KPool_Common_Uuid,
    identityName: z.string(),
    email: z.string(),
  })
  .passthrough();
const PrincipalGroupSummary = z
  .object({
    principalGroupIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
    name: z.string(),
    roleIdentifiers: z.array(KPool_Common_Uuid),
    isDefault: z.boolean(),
    members: z.array(PrincipalGroupMemberSummary).optional(),
  })
  .passthrough();
const ListPrincipalGroupsResponseBody = z
  .object({ principalGroups: z.array(PrincipalGroupSummary) })
  .passthrough();
const CreatePrincipalGroupRequestBody = z
  .object({ accountIdentifier: KPool_Common_Uuid, name: z.string() })
  .passthrough();
const CreatedPrincipalGroupSummary = PrincipalGroupSummary;
const UpdatePrincipalGroupMembersItem = z
  .object({
    principalGroupIdentifier: KPool_Common_Uuid,
    principalIdentifiers: z.array(KPool_Common_Uuid),
  })
  .passthrough();
const UpdatePrincipalGroupMembersRequestBody = z
  .object({ principalGroups: z.array(UpdatePrincipalGroupMembersItem) })
  .passthrough();
const MutatePrincipalGroupMemberRequestBody = z
  .object({ principalIdentifier: KPool_Common_Uuid })
  .passthrough();

export const schemas = {
  KPool_Common_Uuid,
  KPool_Common_Timestamp,
  VerificationRejectionReasonSummary,
  ContactAddressSummary,
  AccountSummary,
  AccountCategoryChangeRequestListItemSummary,
  ListAccountCategoryChangeRequestsResponseBody,
  KPool_Common_ProblemDetails,
  AccountCategoryChangeRequestSummary,
  AccountCategoryChangeRequestIdentitySummary,
  AccountDocumentSummary,
  AccountCategoryChangeRequestDetailResponseBody,
  RejectAccountCategoryChangeRequestBody,
  CreateAccountRequestBody,
  CreateAccountResult,
  RequestAccountCategoryChangeRequestBody,
  UpdateAccountRequestBody,
  AccountDocumentUploadItem,
  UploadAccountDocumentsRequestBody,
  UploadAccountDocumentsResponseBody,
  AffiliationTermsSummary,
  RequestAffiliationRequestBody,
  AffiliationSummary,
  TerminateAffiliationRequestBody,
  GrantDelegationPermissionRequestBody,
  DelegationPermissionSummary,
  RequestDelegationRequestBody,
  DelegationSummary,
  ApproveDelegationRequestBody,
  RevokeDelegationRequestBody,
  InviteMemberRequestBody,
  InvitationSummary,
  MemberPrincipalGroupSummary,
  AccountMemberSummary,
  ListMembersResponseBody,
  ListAccountDocumentsResponseBody,
  PrincipalGroupMemberSummary,
  PrincipalGroupSummary,
  ListPrincipalGroupsResponseBody,
  CreatePrincipalGroupRequestBody,
  CreatedPrincipalGroupSummary,
  UpdatePrincipalGroupMembersItem,
  UpdatePrincipalGroupMembersRequestBody,
  MutatePrincipalGroupMemberRequestBody,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/account-category-change-requests",
    alias:
      "AccountCategoryChangeRequestOperations_listAccountCategoryChangeRequests",
    description: `List account category change requests for operations review.`,
    requestFormat: "json",
    parameters: [
      {
        name: "status",
        type: "Query",
        schema: z.enum(["pending", "approved", "rejected"]).nullish(),
      },
      {
        name: "requestedAccountCategory",
        type: "Query",
        schema: z.enum(["agency", "talent", "general"]).nullish(),
      },
      {
        name: "perPage",
        type: "Query",
        schema: z.number().int().nullish(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().nullish(),
      },
    ],
    response: ListAccountCategoryChangeRequestsResponseBody,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/account-category-change-requests/:requestId",
    alias:
      "AccountCategoryChangeRequestOperations_getAccountCategoryChangeRequest",
    description: `Get an account category change request detail for operations review.`,
    requestFormat: "json",
    parameters: [
      {
        name: "requestId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: AccountCategoryChangeRequestDetailResponseBody,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/account-category-change-requests/:requestId/approve",
    alias:
      "AccountCategoryChangeRequestOperations_approveAccountCategoryChangeRequest",
    description: `Approve an account category change request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "requestId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: AccountCategoryChangeRequestSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/account-category-change-requests/:requestId/reject",
    alias:
      "AccountCategoryChangeRequestOperations_rejectAccountCategoryChangeRequest",
    description: `Reject an account category change request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RejectAccountCategoryChangeRequestBody,
      },
      {
        name: "requestId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: AccountCategoryChangeRequestSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/accounts",
    alias: "AccountOperations_createAccount",
    description: `Create an account.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreateAccountRequestBody,
      },
    ],
    response: CreateAccountResult,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/accounts/:accountId",
    alias: "AccountOperations_getAccount",
    description: `Get account information.`,
    requestFormat: "json",
    parameters: [
      {
        name: "accountId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: AccountSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/accounts/:accountId",
    alias: "AccountOperations_updateAccount",
    description: `Update account information.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UpdateAccountRequestBody,
      },
      {
        name: "accountId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: AccountSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/accounts/:accountId",
    alias: "AccountOperations_deleteAccount",
    description: `Delete an account.`,
    requestFormat: "json",
    parameters: [
      {
        name: "accountId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: AccountSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/accounts/:accountId/documents",
    alias: "AccountOperations_uploadDocuments",
    description: `Upload required documents for an account.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UploadAccountDocumentsRequestBody,
      },
      {
        name: "accountId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: UploadAccountDocumentsResponseBody,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/accounts/:accountId/documents/:documentType",
    alias: "AccountOperations_viewAccountDocument",
    description: `View a saved document file for the specified account as an operator.`,
    requestFormat: "json",
    parameters: [
      {
        name: "accountId",
        type: "Path",
        schema: z.string().uuid(),
      },
      {
        name: "documentType",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/accounts/:accountIdentifier/category-change-requests",
    alias:
      "AccountCategoryChangeRequestOperations_requestAccountCategoryChange",
    description: `Request account category change.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RequestAccountCategoryChangeRequestBody,
      },
      {
        name: "accountIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: AccountCategoryChangeRequestSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/affiliations",
    alias: "AffiliationOperations_requestAffiliation",
    description: `Request an affiliation.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RequestAffiliationRequestBody,
      },
    ],
    response: AffiliationSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 409,
        description: `The request conflicts with the current state of the server.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/affiliations/:affiliationId/approve",
    alias: "AffiliationOperations_approveAffiliation",
    description: `Approve an affiliation.`,
    requestFormat: "json",
    parameters: [
      {
        name: "affiliationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: AffiliationSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/affiliations/:affiliationId/reject",
    alias: "AffiliationOperations_rejectAffiliation",
    description: `Reject an affiliation.`,
    requestFormat: "json",
    parameters: [
      {
        name: "affiliationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/affiliations/:affiliationId/terminate",
    alias: "AffiliationOperations_terminateAffiliation",
    description: `Terminate an affiliation.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: TerminateAffiliationRequestBody,
      },
      {
        name: "affiliationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: AffiliationSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/delegation-permissions",
    alias: "DelegationPermissionOperations_grantDelegationPermission",
    description: `Grant a delegation permission.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: GrantDelegationPermissionRequestBody,
      },
    ],
    response: DelegationPermissionSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/delegation-permissions/:delegationPermissionId",
    alias: "DelegationPermissionOperations_revokeDelegationPermission",
    description: `Revoke a delegation permission.`,
    requestFormat: "json",
    parameters: [
      {
        name: "delegationPermissionId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/delegations",
    alias: "DelegationOperations_requestDelegation",
    description: `Request a delegation.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RequestDelegationRequestBody,
      },
    ],
    response: DelegationSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/delegations/:delegationId/approve",
    alias: "DelegationOperations_approveDelegation",
    description: `Approve a delegation.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApproveDelegationRequestBody,
      },
      {
        name: "delegationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DelegationSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/delegations/:delegationId/revoke",
    alias: "DelegationOperations_revokeDelegation",
    description: `Revoke a delegation.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RevokeDelegationRequestBody,
      },
      {
        name: "delegationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DelegationSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/invitations",
    alias: "InvitationOperations_inviteMember",
    description: `Invite members for one or more email addresses.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: InviteMemberRequestBody,
      },
    ],
    response: z.array(InvitationSummary),
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/members",
    alias: "MemberOperations_listMembers",
    description: `List account members.`,
    requestFormat: "json",
    response: ListMembersResponseBody,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/my/documents",
    alias: "MyAccountOperations_listMyAccountDocuments",
    description: `List saved documents for the authenticated account.`,
    requestFormat: "json",
    response: ListAccountDocumentsResponseBody,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "get",
    path: "/principal-groups",
    alias: "PrincipalGroupOperations_listPrincipalGroups",
    description: `List principal groups.`,
    requestFormat: "json",
    response: ListPrincipalGroupsResponseBody,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/principal-groups",
    alias: "PrincipalGroupOperations_createPrincipalGroup",
    description: `Create an principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreatePrincipalGroupRequestBody,
      },
    ],
    response: CreatedPrincipalGroupSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "delete",
    path: "/principal-groups/:principalGroupId",
    alias: "PrincipalGroupOperations_deletePrincipalGroup",
    description: `Delete an principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "principalGroupId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/principal-groups/:principalGroupId/add-member",
    alias: "PrincipalGroupOperations_addPrincipalToPrincipalGroup",
    description: `Add an identity to an principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: MutatePrincipalGroupMemberRequestBody,
      },
      {
        name: "principalGroupId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: PrincipalGroupSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/principal-groups/:principalGroupId/remove-member",
    alias: "PrincipalGroupOperations_removePrincipalFromPrincipalGroup",
    description: `Remove an identity from an principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: MutatePrincipalGroupMemberRequestBody,
      },
      {
        name: "principalGroupId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: PrincipalGroupSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "patch",
    path: "/principal-groups/members",
    alias: "PrincipalGroupOperations_updatePrincipalGroupMembers",
    description: `Update members for multiple principal groups.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UpdatePrincipalGroupMembersRequestBody,
      },
    ],
    response: ListPrincipalGroupsResponseBody,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 403,
        description: `Access is forbidden.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 422,
        description: `Client error`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
]);

export const accountApi = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
