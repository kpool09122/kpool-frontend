import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const KPool_Common_Uuid = z.string();
const IdentityProfileSummary = z
  .object({
    identityIdentifier: KPool_Common_Uuid,
    identityName: z.string(),
    language: z.string(),
    profileImage: z.string().nullish(),
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
const LoginRequestBody = z
  .object({
    email: z.string(),
    password: z.string(),
    return_to: z.string().nullish(),
  })
  .passthrough();
const IdentitySummary = z
  .object({
    identityIdentifier: KPool_Common_Uuid,
    identityName: z.string(),
    email: z.string(),
    language: z.string(),
    profileImage: z.string().nullish(),
  })
  .passthrough();
const LoginIdentitySummary = IdentitySummary;
const KPool_Common_EmptyJsonObject = z.object({}).partial().passthrough();
const AuthenticatedIdentitySummary = IdentitySummary;
const CreateIdentityRequestBody = z
  .object({
    identityName: z.string(),
    email: z.string(),
    password: z.string(),
    confirmedPassword: z.string(),
    base64EncodedImage: z.string().nullish(),
    invitationToken: z.string().nullish(),
  })
  .passthrough();
const SendAuthCodeRequestBody = z.object({ email: z.string() }).passthrough();
const RedirectUrlResult = z.object({ redirectUrl: z.string() }).passthrough();
const SwitchIdentityRequestBody = z
  .object({ targetDelegationIdentifier: KPool_Common_Uuid.nullable() })
  .partial()
  .passthrough();
const SwitchedIdentitySummary = IdentitySummary;
const VerifyEmailRequestBody = z
  .object({ email: z.string(), authCode: z.string() })
  .passthrough();
const KPool_Common_Timestamp = z.string();
const VerifyEmailResult = z
  .object({ email: z.string(), verifiedAt: KPool_Common_Timestamp.nullish() })
  .passthrough();
const UpdateIdentityRequestBody = z
  .object({
    identityName: z.string().nullable(),
    language: z.string().nullable(),
    base64EncodedImage: z.string().nullable(),
  })
  .partial()
  .passthrough();

export const schemas = {
  KPool_Common_Uuid,
  IdentityProfileSummary,
  KPool_Common_ProblemDetails,
  LoginRequestBody,
  IdentitySummary,
  LoginIdentitySummary,
  KPool_Common_EmptyJsonObject,
  AuthenticatedIdentitySummary,
  CreateIdentityRequestBody,
  SendAuthCodeRequestBody,
  RedirectUrlResult,
  SwitchIdentityRequestBody,
  SwitchedIdentitySummary,
  VerifyEmailRequestBody,
  KPool_Common_Timestamp,
  VerifyEmailResult,
  UpdateIdentityRequestBody,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/auth/identities/:identityIdentifier/profile",
    alias: "IdentityAuthOperations_getIdentityProfile",
    description: `Get profile fields for the requested identity. Any authenticated identity may fetch the profile.`,
    requestFormat: "json",
    parameters: [
      {
        name: "identityIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: IdentityProfileSummary,
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
    path: "/auth/login",
    alias: "IdentityAuthOperations_login",
    description: `Authenticate with email and password.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: LoginRequestBody,
      },
    ],
    response: LoginIdentitySummary,
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
    path: "/auth/logout",
    alias: "IdentityAuthOperations_logout",
    description: `Log out the current authenticated identity.`,
    requestFormat: "json",
    response: z.object({}).partial().passthrough(),
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
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
    path: "/auth/me",
    alias: "IdentityAuthOperations_getAuthenticatedIdentity",
    description: `Get the current authenticated identity.`,
    requestFormat: "json",
    response: AuthenticatedIdentitySummary,
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
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/register",
    alias: "IdentityAuthOperations_createIdentity",
    description: `Register a new identity.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreateIdentityRequestBody,
      },
    ],
    response: IdentitySummary,
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
    path: "/auth/send-auth-code",
    alias: "IdentityAuthOperations_sendAuthCode",
    description: `Send an auth code to the specified email address.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ email: z.string() }).passthrough(),
      },
    ],
    response: z.object({}).partial().passthrough(),
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
    method: "get",
    path: "/auth/social/:provider/callback",
    alias: "IdentityAuthOperations_socialLoginCallback",
    description: `Handle the social login callback and return the client redirect URL.`,
    requestFormat: "json",
    parameters: [
      {
        name: "provider",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "code",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "state",
        type: "Query",
        schema: z.string(),
      },
    ],
    response: z.object({ redirectUrl: z.string() }).passthrough(),
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
    method: "get",
    path: "/auth/social/:provider/redirect",
    alias: "IdentityAuthOperations_socialLoginRedirect",
    description: `Create an OAuth redirect URL for the selected social provider.`,
    requestFormat: "json",
    parameters: [
      {
        name: "provider",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "accountType",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "invitationToken",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "return_to",
        type: "Query",
        schema: z.string().nullish(),
      },
    ],
    response: z.object({ redirectUrl: z.string() }).passthrough(),
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
    path: "/auth/switch-identity",
    alias: "IdentityAuthOperations_switchIdentity",
    description: `Switch the current authenticated identity or clear delegation.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SwitchIdentityRequestBody,
      },
    ],
    response: SwitchedIdentitySummary,
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
    path: "/auth/verify-email",
    alias: "IdentityAuthOperations_verifyEmail",
    description: `Verify an email address using the issued auth code.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: VerifyEmailRequestBody,
      },
    ],
    response: VerifyEmailResult,
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
    method: "patch",
    path: "/identities/me",
    alias: "IdentityOperations_updateIdentity",
    description: `Update the current identity profile.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UpdateIdentityRequestBody,
      },
    ],
    response: IdentitySummary,
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

export const identityApi = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
