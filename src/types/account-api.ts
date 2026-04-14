import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const KPool_Common_Uuid = z.string();
const VerificationDocumentUploadRequestBody = z
  .object({
    documentType: z.string(),
    fileName: z.string(),
    fileContents: z.string(),
    fileSizeBytes: z.number().int(),
  })
  .passthrough();
const RequestVerificationRequestBody = z
  .object({
    accountIdentifier: KPool_Common_Uuid,
    verificationType: z.string(),
    applicantName: z.string(),
    documents: z.array(VerificationDocumentUploadRequestBody),
  })
  .passthrough();
const KPool_Common_Timestamp = z.string();
const VerificationRejectionReasonSummary = z
  .object({ code: z.string(), detail: z.string().nullish() })
  .passthrough();
const VerificationDocumentSummary = z
  .object({
    documentIdentifier: KPool_Common_Uuid,
    documentType: z.string(),
    documentPath: z.string(),
    originalFileName: z.string(),
    fileSizeBytes: z.number().int(),
    uploadedAt: KPool_Common_Timestamp,
  })
  .passthrough();
const AccountVerificationSummary = z
  .object({
    verificationIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
    verificationType: z.string(),
    status: z.string(),
    applicantName: z.string(),
    requestedAt: KPool_Common_Timestamp,
    reviewedBy: KPool_Common_Uuid.nullish(),
    reviewedAt: KPool_Common_Timestamp.nullish(),
    rejectionReason: VerificationRejectionReasonSummary.nullish(),
    documents: z.array(VerificationDocumentSummary),
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
const ApproveVerificationRequestBody = z
  .object({ reviewerAccountIdentifier: KPool_Common_Uuid })
  .passthrough();
const RejectVerificationRequestBody = z
  .object({
    reviewerAccountIdentifier: KPool_Common_Uuid,
    rejectionReasonCode: z.string(),
    rejectionReasonDetail: z.string().nullish(),
  })
  .passthrough();
const CreateAccountRequestBody = z
  .object({
    email: z.string(),
    accountType: z.string(),
    accountName: z.string(),
    identityIdentifier: KPool_Common_Uuid.nullish(),
  })
  .passthrough();
const AccountSummary = z
  .object({
    accountIdentifier: KPool_Common_Uuid,
    email: z.string(),
    type: z.string(),
    name: z.string(),
    status: z.string(),
  })
  .passthrough();
const CreatedAccountSummary = AccountSummary;
const AffiliationTermsSummary = z
  .object({
    revenueSharePercentage: z.number().int(),
    contractNotes: z.string(),
  })
  .partial()
  .passthrough();
const RequestAffiliationRequestBody = z
  .object({
    agencyAccountIdentifier: KPool_Common_Uuid,
    talentAccountIdentifier: KPool_Common_Uuid,
    requestedBy: KPool_Common_Uuid,
    terms: AffiliationTermsSummary.nullish(),
  })
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
const ApproveAffiliationRequestBody = z
  .object({ approverAccountIdentifier: KPool_Common_Uuid })
  .passthrough();
const RejectAffiliationRequestBody = z
  .object({ rejectorAccountIdentifier: KPool_Common_Uuid })
  .passthrough();
const TerminateAffiliationRequestBody = z
  .object({ terminatorAccountIdentifier: KPool_Common_Uuid })
  .passthrough();
const GrantDelegationPermissionRequestBody = z
  .object({
    identityGroupIdentifier: KPool_Common_Uuid,
    targetAccountIdentifier: KPool_Common_Uuid,
    affiliationIdentifier: KPool_Common_Uuid,
  })
  .passthrough();
const DelegationPermissionSummary = z
  .object({
    delegationPermissionIdentifier: KPool_Common_Uuid,
    identityGroupIdentifier: KPool_Common_Uuid,
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
const CreateIdentityGroupRequestBody = z
  .object({
    accountIdentifier: KPool_Common_Uuid,
    name: z.string(),
    role: z.string(),
  })
  .passthrough();
const IdentityGroupSummary = z
  .object({
    identityGroupIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
    name: z.string(),
    role: z.string(),
    isDefault: z.boolean(),
    members: z.array(KPool_Common_Uuid).optional(),
  })
  .passthrough();
const CreatedIdentityGroupSummary = IdentityGroupSummary;
const MutateIdentityGroupMemberRequestBody = z
  .object({ identityIdentifier: KPool_Common_Uuid })
  .passthrough();
const CreateInvitationRequestBody = z
  .object({
    accountIdentifier: KPool_Common_Uuid,
    inviterIdentityIdentifier: KPool_Common_Uuid,
    emails: z.array(z.string()),
  })
  .passthrough();
const InvitationSummary = z
  .object({
    invitationIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
    invitedByIdentityIdentifier: KPool_Common_Uuid,
    email: z.string(),
    token: z.string(),
    status: z.string(),
    expiresAt: KPool_Common_Timestamp,
    createdAt: KPool_Common_Timestamp,
  })
  .passthrough();

export const schemas = {
  KPool_Common_Uuid,
  VerificationDocumentUploadRequestBody,
  RequestVerificationRequestBody,
  KPool_Common_Timestamp,
  VerificationRejectionReasonSummary,
  VerificationDocumentSummary,
  AccountVerificationSummary,
  KPool_Common_ProblemDetails,
  ApproveVerificationRequestBody,
  RejectVerificationRequestBody,
  CreateAccountRequestBody,
  AccountSummary,
  CreatedAccountSummary,
  AffiliationTermsSummary,
  RequestAffiliationRequestBody,
  AffiliationSummary,
  ApproveAffiliationRequestBody,
  RejectAffiliationRequestBody,
  TerminateAffiliationRequestBody,
  GrantDelegationPermissionRequestBody,
  DelegationPermissionSummary,
  RequestDelegationRequestBody,
  DelegationSummary,
  ApproveDelegationRequestBody,
  RevokeDelegationRequestBody,
  CreateIdentityGroupRequestBody,
  IdentityGroupSummary,
  CreatedIdentityGroupSummary,
  MutateIdentityGroupMemberRequestBody,
  CreateInvitationRequestBody,
  InvitationSummary,
};

const endpoints = makeApi([
  {
    method: "post",
    path: "/account-verifications",
    alias: "AccountVerificationOperations_requestVerification",
    description: `Request account verification.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RequestVerificationRequestBody,
      },
    ],
    response: AccountVerificationSummary,
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
    method: "post",
    path: "/account-verifications/:verificationId/approve",
    alias: "AccountVerificationOperations_approveVerification",
    description: `Approve account verification.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApproveVerificationRequestBody,
      },
      {
        name: "verificationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: AccountVerificationSummary,
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
    path: "/account-verifications/:verificationId/reject",
    alias: "AccountVerificationOperations_rejectVerification",
    description: `Reject account verification.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RejectVerificationRequestBody,
      },
      {
        name: "verificationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: AccountVerificationSummary,
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
    response: CreatedAccountSummary,
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
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
        name: "body",
        type: "Body",
        schema: ApproveAffiliationRequestBody,
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
    path: "/affiliations/:affiliationId/reject",
    alias: "AffiliationOperations_rejectAffiliation",
    description: `Reject an affiliation.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RejectAffiliationRequestBody,
      },
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
    path: "/identity-groups",
    alias: "IdentityGroupOperations_createIdentityGroup",
    description: `Create an identity group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreateIdentityGroupRequestBody,
      },
    ],
    response: CreatedIdentityGroupSummary,
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
    path: "/identity-groups/:identityGroupId",
    alias: "IdentityGroupOperations_deleteIdentityGroup",
    description: `Delete an identity group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "identityGroupId",
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
    path: "/identity-groups/:identityGroupId/add-member",
    alias: "IdentityGroupOperations_addIdentityToIdentityGroup",
    description: `Add an identity to an identity group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: MutateIdentityGroupMemberRequestBody,
      },
      {
        name: "identityGroupId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: IdentityGroupSummary,
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
    path: "/identity-groups/:identityGroupId/remove-member",
    alias: "IdentityGroupOperations_removeIdentityFromIdentityGroup",
    description: `Remove an identity from an identity group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: MutateIdentityGroupMemberRequestBody,
      },
      {
        name: "identityGroupId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: IdentityGroupSummary,
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
    path: "/invitations",
    alias: "InvitationOperations_createInvitation",
    description: `Create invitations for one or more email addresses.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreateInvitationRequestBody,
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
]);

export const accountApi = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
