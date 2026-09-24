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
const KPool_Common_Timestamp = z.string();
const PasskeySummary = z
  .object({
    passkeyIdentifier: KPool_Common_Uuid,
    displayName: z.string(),
    transports: z.array(z.string()),
    backupEligible: z.boolean(),
    backupState: z.boolean(),
    lastUsedAt: KPool_Common_Timestamp.nullable(),
    createdAt: KPool_Common_Timestamp,
  })
  .passthrough();
const PasskeyListResult = z
  .object({ passkeys: z.array(PasskeySummary) })
  .passthrough();
const PasskeyAuthenticatorAttestationResponse = z
  .object({
    clientDataJSON: z.string(),
    attestationObject: z.string(),
    transports: z.array(z.string()).nullish(),
  })
  .passthrough();
const PasskeyRegistrationCredential = z
  .object({
    id: z.string(),
    rawId: z.string(),
    type: z.literal("public-key"),
    response: PasskeyAuthenticatorAttestationResponse,
    authenticatorAttachment: z.string().nullish(),
    clientExtensionResults: KPool_Common_EmptyJsonObject.nullish(),
  })
  .passthrough();
const AddPasskeyRequestBody = z
  .object({
    challengeKey: KPool_Common_Uuid.uuid(),
    displayName: z.string().max(64),
    credential: PasskeyRegistrationCredential,
  })
  .passthrough();
const PasskeyRelyingPartyEntity = z
  .object({ name: z.string(), id: z.string() })
  .passthrough();
const PasskeyUserEntity = z
  .object({ name: z.string(), id: z.string(), displayName: z.string() })
  .passthrough();
const PasskeyCredentialParameter = z
  .object({ type: z.string(), alg: z.number().int() })
  .passthrough();
const PasskeyCredentialDescriptor = z
  .object({
    type: z.string(),
    id: z.string(),
    transports: z.array(z.string()).nullish(),
  })
  .passthrough();
const PasskeyAuthenticatorSelection = z
  .object({
    residentKey: z.string(),
    userVerification: z.string(),
    requireResidentKey: z.boolean().nullish(),
  })
  .passthrough();
const PasskeyRegistrationOptions = z
  .object({
    rp: PasskeyRelyingPartyEntity,
    user: PasskeyUserEntity,
    challenge: z.string(),
    pubKeyCredParams: z.array(PasskeyCredentialParameter),
    timeout: z.number().int(),
    excludeCredentials: z.array(PasskeyCredentialDescriptor),
    authenticatorSelection: PasskeyAuthenticatorSelection,
    attestation: z.string(),
  })
  .passthrough();
const PasskeyRegistrationOptionsResult = z
  .object({
    challengeKey: KPool_Common_Uuid,
    options: PasskeyRegistrationOptions,
  })
  .passthrough();
const PasskeyAuthenticatorAssertionResponse = z
  .object({
    clientDataJSON: z.string(),
    authenticatorData: z.string(),
    signature: z.string(),
    userHandle: z.string().nullish(),
  })
  .passthrough();
const PasskeyAuthenticationCredential = z
  .object({
    id: z.string(),
    rawId: z.string(),
    type: z.literal("public-key"),
    response: PasskeyAuthenticatorAssertionResponse,
    authenticatorAttachment: z.string().nullish(),
    clientExtensionResults: KPool_Common_EmptyJsonObject.nullish(),
  })
  .passthrough();
const AuthenticateWithPasskeyRequestBody = z
  .object({
    challengeKey: KPool_Common_Uuid.uuid(),
    credential: PasskeyAuthenticationCredential,
  })
  .passthrough();
const PasskeyAuthenticationOptions = z
  .object({
    challenge: z.string(),
    timeout: z.number().int(),
    rpId: z.string(),
    allowCredentials: z.array(PasskeyCredentialDescriptor),
    userVerification: z.string(),
  })
  .passthrough();
const PasskeyAuthenticationOptionsResult = z
  .object({
    challengeKey: KPool_Common_Uuid,
    options: PasskeyAuthenticationOptions,
  })
  .passthrough();
const CreatePasskeyRegistrationOptionsRequestBody = z
  .object({
    email: z.string(),
    accountType: z.string().nullish(),
    oneTimeToken: z.string().nullish(),
    return_to: z.string().nullish(),
  })
  .passthrough();
const CreateIdentityRequestBody = z
  .object({
    identityName: z.string(),
    email: z.string(),
    password: z.string(),
    confirmedPassword: z.string(),
    base64EncodedImage: z.string().nullish(),
    oneTimeToken: z.string().nullish(),
  })
  .passthrough();
const SendAuthCodeRequestBody = z.object({ email: z.string() }).passthrough();
const RedirectUrlResult = z.object({ redirectUrl: z.string() }).passthrough();
const VerifyEmailRequestBody = z
  .object({ email: z.string(), authCode: z.string() })
  .passthrough();
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
const AccountPolicyConditionClause = z
  .object({
    field: z.string(),
    operator: z.string(),
    value: z.union([z.string(), z.array(z.string()), z.boolean()]),
  })
  .passthrough();
const AccountPolicyCondition = z
  .object({ clauses: z.array(AccountPolicyConditionClause) })
  .partial()
  .passthrough();
const AccountPolicyStatement = z
  .object({
    effect: z.string(),
    actions: z.array(z.string()),
    resourceTypes: z.array(z.string()),
    condition: AccountPolicyCondition.nullish(),
  })
  .passthrough();
const AccountEffectivePolicySummary = z
  .object({
    policyIdentifier: KPool_Common_Uuid,
    name: z.string(),
    isSystemPolicy: z.boolean(),
    statements: z.array(AccountPolicyStatement),
  })
  .passthrough();
const AuthenticatedAccountAddressSummary = z
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
const AuthenticatedAccountReferenceSummary = z
  .object({ accountIdentifier: KPool_Common_Uuid, name: z.string() })
  .passthrough();
const AuthenticatedAccountSummary = z
  .object({
    accountIdentifier: KPool_Common_Uuid,
    email: z.string(),
    type: z.string(),
    name: z.string(),
    status: z.string(),
    accountCategory: z.string(),
    phone: z.string().nullish(),
    address: AuthenticatedAccountAddressSummary.nullish(),
  })
  .passthrough();
const SwitchableAccountSummary = z
  .object({
    delegationIdentifier: KPool_Common_Uuid,
    accountIdentifier: KPool_Common_Uuid,
    account: AuthenticatedAccountReferenceSummary,
    isCurrent: z.boolean(),
  })
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
  KPool_Common_Timestamp,
  PasskeySummary,
  PasskeyListResult,
  PasskeyAuthenticatorAttestationResponse,
  PasskeyRegistrationCredential,
  AddPasskeyRequestBody,
  PasskeyRelyingPartyEntity,
  PasskeyUserEntity,
  PasskeyCredentialParameter,
  PasskeyCredentialDescriptor,
  PasskeyAuthenticatorSelection,
  PasskeyRegistrationOptions,
  PasskeyRegistrationOptionsResult,
  PasskeyAuthenticatorAssertionResponse,
  PasskeyAuthenticationCredential,
  AuthenticateWithPasskeyRequestBody,
  PasskeyAuthenticationOptions,
  PasskeyAuthenticationOptionsResult,
  CreatePasskeyRegistrationOptionsRequestBody,
  CreateIdentityRequestBody,
  SendAuthCodeRequestBody,
  RedirectUrlResult,
  VerifyEmailRequestBody,
  VerifyEmailResult,
  UpdateIdentityRequestBody,
  AccountPolicyConditionClause,
  AccountPolicyCondition,
  AccountPolicyStatement,
  AccountEffectivePolicySummary,
  AuthenticatedAccountAddressSummary,
  AuthenticatedAccountReferenceSummary,
  AuthenticatedAccountSummary,
  SwitchableAccountSummary,
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
    method: "get",
    path: "/auth/passkeys",
    alias: "IdentityAuthOperations_listPasskeys",
    description: `List passkeys registered by the current authenticated identity.`,
    requestFormat: "json",
    response: PasskeyListResult,
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
    method: "post",
    path: "/auth/passkeys/addition",
    alias: "IdentityAuthOperations_addPasskey",
    description: `Verify and register an additional passkey for the authenticated identity.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AddPasskeyRequestBody,
      },
    ],
    response: z.object({}).partial().passthrough(),
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
    path: "/auth/passkeys/addition/options",
    alias: "IdentityAuthOperations_createPasskeyOptions",
    description: `Create WebAuthn registration options for adding a passkey to the authenticated identity.`,
    requestFormat: "json",
    response: PasskeyRegistrationOptionsResult,
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
    method: "post",
    path: "/auth/passkeys/authentication",
    alias: "IdentityAuthOperations_authenticateWithPasskey",
    description: `Verify a WebAuthn assertion and establish an authenticated session.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AuthenticateWithPasskeyRequestBody,
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
    path: "/auth/passkeys/authentication/options",
    alias: "IdentityAuthOperations_createPasskeyAuthenticationOptions",
    description: `Create discoverable WebAuthn authentication options without requiring an email address.`,
    requestFormat: "json",
    response: PasskeyAuthenticationOptionsResult,
    errors: [
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
  {
    method: "post",
    path: "/auth/passkeys/registration/options",
    alias: "IdentityAuthOperations_createPasskeyRegistrationOptions",
    description: `Create WebAuthn registration options for a verified or invited email address.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreatePasskeyRegistrationOptionsRequestBody,
      },
    ],
    response: PasskeyRegistrationOptionsResult,
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
        name: "oneTimeToken",
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
