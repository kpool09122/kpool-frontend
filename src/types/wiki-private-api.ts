import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const KPool_Common_Uuid = z.string();
const UploadImageRequestBody = z
  .object({
    publishedImageIdentifier: KPool_Common_Uuid.optional(),
    resourceType: z.string(),
    wikiIdentifier: KPool_Common_Uuid,
    base64EncodedImage: z.string(),
    imageUsage: z.string(),
    displayOrder: z.number().int(),
    sourceUrl: z.string(),
    sourceName: z.string(),
    altText: z.string(),
    agreedToTermsAt: z.string(),
  })
  .passthrough();
const ImageDraftSummary = z
  .object({
    imageIdentifier: KPool_Common_Uuid,
    resourceType: z.string(),
    imageUsage: z.string(),
    status: z.string(),
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
const ReviewImageHideRequestBody = z
  .object({ reviewerComment: z.string() })
  .passthrough();
const ImageHideReviewSummary = z
  .object({
    imageIdentifier: KPool_Common_Uuid,
    status: z.string(),
    reviewerComment: z.string(),
    isHidden: z.boolean(),
  })
  .passthrough();
const ImageSummary = z
  .object({
    imageIdentifier: KPool_Common_Uuid,
    resourceType: z.string(),
    imageUsage: z.string(),
    isHidden: z.boolean(),
  })
  .passthrough();
const RequestImageHideRequestBody = z
  .object({
    requesterName: z.string(),
    requesterEmail: z.string(),
    reason: z.string(),
  })
  .passthrough();
const ImageHideRequestSummary = z
  .object({
    imageIdentifier: KPool_Common_Uuid,
    requesterName: z.string(),
    requesterEmail: z.string(),
    reason: z.string(),
    status: z.string(),
  })
  .passthrough();
const RequestCertificationRequestBody = z
  .object({
    resourceType: z.string(),
    wikiId: KPool_Common_Uuid,
    ownerAccountId: KPool_Common_Uuid,
  })
  .passthrough();
const OfficialCertificationSummary = z
  .object({
    certificationIdentifier: KPool_Common_Uuid,
    resourceType: z.string(),
    wikiIdentifier: KPool_Common_Uuid,
    status: z.string(),
  })
  .passthrough();
const PolicyConditionClause = z
  .object({ field: z.string(), operator: z.string(), value: z.string() })
  .passthrough();
const PolicyCondition = z
  .object({ clauses: z.array(PolicyConditionClause) })
  .partial()
  .passthrough();
const PolicyStatement = z
  .object({
    effect: z.string(),
    actions: z.array(z.string()),
    resourceTypes: z.array(z.string()),
    condition: PolicyCondition.optional(),
  })
  .passthrough();
const CreatePolicyRequestBody = z
  .object({
    name: z.string(),
    statements: z.array(PolicyStatement),
    isSystemPolicy: z.boolean(),
  })
  .passthrough();
const PolicySummary = z
  .object({
    policyIdentifier: KPool_Common_Uuid,
    name: z.string(),
    isSystemPolicy: z.boolean(),
    createdAt: z.string(),
  })
  .passthrough();
const CreatePrincipalGroupRequestBody = z
  .object({ accountIdentifier: KPool_Common_Uuid, name: z.string() })
  .passthrough();
const PrincipalGroupSummary = z
  .object({
    principalGroupIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
    name: z.string(),
    isDefault: z.boolean(),
    memberCount: z.number().int(),
    createdAt: z.string(),
  })
  .passthrough();
const MutatePrincipalGroupMemberRequestBody = z
  .object({ principalIdentifier: KPool_Common_Uuid })
  .passthrough();
const AttachRoleToPrincipalGroupRequestBody = z
  .object({ roleIdentifier: KPool_Common_Uuid })
  .passthrough();
const CreatePrincipalRequestBody = z
  .object({
    identityIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
  })
  .passthrough();
const PrincipalSummary = z
  .object({
    principalIdentifier: KPool_Common_Uuid,
    identityIdentifier: KPool_Common_Uuid,
    isDelegatedPrincipal: z.boolean(),
    isEnabled: z.boolean(),
  })
  .passthrough();
const CreateRoleRequestBody = z
  .object({
    name: z.string(),
    policies: z.array(KPool_Common_Uuid).optional(),
    isSystemRole: z.boolean(),
  })
  .passthrough();
const RoleSummary = z
  .object({
    roleIdentifier: KPool_Common_Uuid,
    name: z.string(),
    isSystemRole: z.boolean(),
    createdAt: z.string(),
  })
  .passthrough();
const AttachPolicyToRoleRequestBody = z
  .object({ policyIdentifier: KPool_Common_Uuid })
  .passthrough();
const VideoLinkInput = z
  .object({
    url: z.string(),
    videoUsage: z.string(),
    title: z.string().optional(),
    displayOrder: z.number().int(),
    thumbnailUrl: z.string().optional(),
    publishedAt: z.string().optional(),
  })
  .passthrough();
const SaveVideoLinksRequestBody = z
  .object({
    resourceType: z.string(),
    wikiIdentifier: KPool_Common_Uuid,
    videoLinks: z.array(VideoLinkInput),
  })
  .passthrough();
const WikiAssociationTargets = z
  .object({
    agencyIdentifier: KPool_Common_Uuid,
    groupIdentifiers: z.array(KPool_Common_Uuid),
    talentIdentifiers: z.array(KPool_Common_Uuid),
  })
  .partial()
  .passthrough();
const AutoCreateWikiRequestBody = WikiAssociationTargets;
const DraftWikiSummary = z
  .object({
    language: z.string(),
    name: z.string(),
    resourceType: z.string(),
    status: z.string(),
  })
  .passthrough();
const CreateWikiRequestBody = WikiAssociationTargets;
const WikiWorkflowRequestBody = WikiAssociationTargets;
const UpdateWikiDraftRequestBody = WikiAssociationTargets;
const PublishWikiRequestBody = WikiAssociationTargets;
const PublishedWikiSummary = z
  .object({
    language: z.string(),
    name: z.string(),
    resourceType: z.string(),
    version: z.number().int(),
  })
  .passthrough();
const RollbackWikiRequestBody = WikiAssociationTargets;
const RollbackWikiResponseBody = z
  .object({ wikis: z.array(PublishedWikiSummary) })
  .passthrough();
const TranslateWikiResponseBody = z
  .object({ draftWikis: z.array(DraftWikiSummary) })
  .passthrough();

export const schemas = {
  KPool_Common_Uuid,
  UploadImageRequestBody,
  ImageDraftSummary,
  KPool_Common_ProblemDetails,
  ReviewImageHideRequestBody,
  ImageHideReviewSummary,
  ImageSummary,
  RequestImageHideRequestBody,
  ImageHideRequestSummary,
  RequestCertificationRequestBody,
  OfficialCertificationSummary,
  PolicyConditionClause,
  PolicyCondition,
  PolicyStatement,
  CreatePolicyRequestBody,
  PolicySummary,
  CreatePrincipalGroupRequestBody,
  PrincipalGroupSummary,
  MutatePrincipalGroupMemberRequestBody,
  AttachRoleToPrincipalGroupRequestBody,
  CreatePrincipalRequestBody,
  PrincipalSummary,
  CreateRoleRequestBody,
  RoleSummary,
  AttachPolicyToRoleRequestBody,
  VideoLinkInput,
  SaveVideoLinksRequestBody,
  WikiAssociationTargets,
  AutoCreateWikiRequestBody,
  DraftWikiSummary,
  CreateWikiRequestBody,
  WikiWorkflowRequestBody,
  UpdateWikiDraftRequestBody,
  PublishWikiRequestBody,
  PublishedWikiSummary,
  RollbackWikiRequestBody,
  RollbackWikiResponseBody,
  TranslateWikiResponseBody,
};

const endpoints = makeApi([
  {
    method: "delete",
    path: "/image/:imageId",
    alias: "ImageOperations_deleteImage",
    description: `Delete an image.`,
    requestFormat: "json",
    parameters: [
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/image/:imageId/approve",
    alias: "ImageOperations_approveImage",
    description: `Approve an image.`,
    requestFormat: "json",
    parameters: [
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ImageDraftSummary,
    errors: [
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
    path: "/image/:imageId/approve-hide-request",
    alias: "ImageOperations_approveImageHideRequest",
    description: `Approve an image hide request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ reviewerComment: z.string() }).passthrough(),
      },
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ImageHideReviewSummary,
    errors: [
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
    path: "/image/:imageId/reject",
    alias: "ImageOperations_rejectImage",
    description: `Reject an image.`,
    requestFormat: "json",
    parameters: [
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ImageSummary,
    errors: [
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
    path: "/image/:imageId/reject-hide-request",
    alias: "ImageOperations_rejectImageHideRequest",
    description: `Reject an image hide request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ reviewerComment: z.string() }).passthrough(),
      },
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ImageHideReviewSummary,
    errors: [
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
    path: "/image/:imageId/request-hide",
    alias: "ImageOperations_requestImageHide",
    description: `Request that an image be hidden.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RequestImageHideRequestBody,
      },
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ImageHideRequestSummary,
    errors: [
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
    path: "/image/:imageId/unhide",
    alias: "ImageOperations_unhideImage",
    description: `Unhide an image.`,
    requestFormat: "json",
    parameters: [
      {
        name: "imageId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: ImageSummary,
    errors: [
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
    path: "/image/upload",
    alias: "ImageOperations_uploadImage",
    description: `Upload a new image.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UploadImageRequestBody,
      },
    ],
    response: ImageDraftSummary,
    errors: [
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
    method: "post",
    path: "/official-certification/:certificationId/approve",
    alias: "OfficialCertificationOperations_approveCertification",
    description: `Approve an official certification request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "certificationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: OfficialCertificationSummary,
    errors: [
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
    path: "/official-certification/:certificationId/reject",
    alias: "OfficialCertificationOperations_rejectCertification",
    description: `Reject an official certification request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "certificationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: OfficialCertificationSummary,
    errors: [
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
    path: "/official-certification/request",
    alias: "OfficialCertificationOperations_requestCertification",
    description: `Create an official certification request.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RequestCertificationRequestBody,
      },
    ],
    response: OfficialCertificationSummary,
    errors: [
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
    path: "/policy/:policyId",
    alias: "PrincipalOperations_deletePolicy",
    description: `Delete a policy.`,
    requestFormat: "json",
    parameters: [
      {
        name: "policyId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/policy/create",
    alias: "PrincipalOperations_createPolicy",
    description: `Create a policy.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreatePolicyRequestBody,
      },
    ],
    response: PolicySummary,
    errors: [
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
    path: "/principal-group/:principalGroupId",
    alias: "PrincipalOperations_deletePrincipalGroup",
    description: `Delete a principal group.`,
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
    path: "/principal-group/:principalGroupId/add-member",
    alias: "PrincipalOperations_addPrincipalToPrincipalGroup",
    description: `Add a principal to a principal group.`,
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
    path: "/principal-group/:principalGroupId/attach-role",
    alias: "PrincipalOperations_attachRoleToPrincipalGroup",
    description: `Attach a role to a principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AttachRoleToPrincipalGroupRequestBody,
      },
      {
        name: "principalGroupId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/principal-group/:principalGroupId/detach-role",
    alias: "PrincipalOperations_detachRoleFromPrincipalGroup",
    description: `Detach a role from a principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AttachRoleToPrincipalGroupRequestBody,
      },
      {
        name: "principalGroupId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/principal-group/:principalGroupId/remove-member",
    alias: "PrincipalOperations_removePrincipalFromPrincipalGroup",
    description: `Remove a principal from a principal group.`,
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
    path: "/principal-group/create",
    alias: "PrincipalOperations_createPrincipalGroup",
    description: `Create a principal group.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreatePrincipalGroupRequestBody,
      },
    ],
    response: PrincipalGroupSummary,
    errors: [
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
    path: "/principal/create",
    alias: "PrincipalOperations_createPrincipal",
    description: `Create a principal.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreatePrincipalRequestBody,
      },
    ],
    response: PrincipalSummary,
    errors: [
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
    path: "/role/:roleId",
    alias: "PrincipalOperations_deleteRole",
    description: `Delete a role.`,
    requestFormat: "json",
    parameters: [
      {
        name: "roleId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/role/:roleId/attach-policy",
    alias: "PrincipalOperations_attachPolicyToRole",
    description: `Attach a policy to a role.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AttachPolicyToRoleRequestBody,
      },
      {
        name: "roleId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/role/:roleId/detach-policy",
    alias: "PrincipalOperations_detachPolicyFromRole",
    description: `Detach a policy from a role.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AttachPolicyToRoleRequestBody,
      },
      {
        name: "roleId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/role/create",
    alias: "PrincipalOperations_createRole",
    description: `Create a role.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreateRoleRequestBody,
      },
    ],
    response: RoleSummary,
    errors: [
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
    path: "/video-link/save",
    alias: "VideoLinkOperations_saveVideoLinks",
    description: `Save video links for a wiki.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SaveVideoLinksRequestBody,
      },
    ],
    response: z.void(),
    errors: [
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
    path: "/wiki/:wikiId/approve",
    alias: "WikiOperations_approveWiki",
    description: `Approve a wiki draft.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: WikiWorkflowRequestBody,
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/edit",
    alias: "WikiOperations_editWiki",
    description: `Edit an existing wiki draft.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UpdateWikiDraftRequestBody,
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/merge",
    alias: "WikiOperations_mergeWiki",
    description: `Merge changes into an existing wiki draft.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UpdateWikiDraftRequestBody,
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/publish",
    alias: "WikiOperations_publishWiki",
    description: `Publish a wiki draft.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PublishWikiRequestBody,
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: PublishedWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/reject",
    alias: "WikiOperations_rejectWiki",
    description: `Reject a wiki draft.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: WikiWorkflowRequestBody,
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/rollback",
    alias: "WikiOperations_rollbackWiki",
    description: `Roll back a wiki to a previous published version.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RollbackWikiRequestBody,
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: RollbackWikiResponseBody,
    errors: [
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
    path: "/wiki/:wikiId/submit",
    alias: "WikiOperations_submitWiki",
    description: `Submit a wiki draft for review.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: WikiWorkflowRequestBody,
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/:wikiId/translate",
    alias: "WikiOperations_translateWiki",
    description: `Translate a wiki draft into additional languages.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: WikiWorkflowRequestBody,
      },
      {
        name: "wikiId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: TranslateWikiResponseBody,
    errors: [
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
    path: "/wiki/auto-create",
    alias: "WikiOperations_autoCreateWiki",
    description: `Automatically create a wiki draft from the provided metadata.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AutoCreateWikiRequestBody,
      },
    ],
    response: DraftWikiSummary,
    errors: [
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
    path: "/wiki/create",
    alias: "WikiOperations_createWiki",
    description: `Create a new wiki draft.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreateWikiRequestBody,
      },
    ],
    response: DraftWikiSummary,
    errors: [
      {
        status: 403,
        description: `Access is forbidden.`,
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
]);

export const wikiPrivateApi = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
