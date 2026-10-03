import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const KPool_Common_ProblemDetails = z
  .object({
    type: z.string(),
    status: z.number().int(),
    title: z.string(),
    detail: z.string(),
    instance: z.string(),
    code: z.string(),
  })
  .partial()
  .passthrough();
const KPool_Common_Uuid = z.string();
const IdentityProfileSummary = z
  .object({
    identityIdentifier: KPool_Common_Uuid,
    identityName: z.string(),
    language: z.string(),
    profileImage: z.string().nullish(),
  })
  .passthrough();
const EmptyJsonArray = z.array(z.unknown());
const IdentitySummary = z
  .object({
    identityIdentifier: KPool_Common_Uuid,
    identityName: z.string(),
    email: z.string(),
    language: z.string(),
    profileImage: z.string().nullish(),
  })
  .passthrough();
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
const KPool_Common_EmptyJsonObject = z.object({}).partial().passthrough();
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
const RecoverPasskeyRequestBody = z
  .object({
    recoveryKey: KPool_Common_Uuid,
    challengeKey: KPool_Common_Uuid,
    displayName: z.string().min(1).max(64),
    credential: PasskeyRegistrationCredential,
  })
  .passthrough();
const SendPasskeyRecoveryEmailRequestBody = z
  .object({ email: z.string() })
  .passthrough();
const VerifyPasskeyRecoveryEmailRequestBody = z
  .object({ email: z.string(), authCode: z.string().min(6).max(6) })
  .passthrough();
const PasskeyRecoveryVerificationResult = z
  .object({ recoveryKey: KPool_Common_Uuid })
  .passthrough();
const CreatePasskeyRecoveryOptionsRequestBody = z
  .object({ recoveryKey: KPool_Common_Uuid })
  .passthrough();
const RedirectUrlResult = z.object({ redirectUrl: z.string() }).passthrough();
const RegisterWithPasskeyRequestBody = z
  .object({
    challengeKey: KPool_Common_Uuid.uuid(),
    identityName: z.string().min(1).max(32),
    displayName: z.string().min(1).max(64),
    base64EncodedImage: z.string().nullish(),
    credential: PasskeyRegistrationCredential,
  })
  .passthrough();
const PasskeyIdentityRegistrationResult = IdentitySummary;
const CreatePasskeyRegistrationOptionsRequestBody = z
  .object({
    email: z.string(),
    oneTimeToken: z.string().nullish(),
    return_to: z.string().nullish(),
  })
  .passthrough();
const UpdatePasskeyRequestBody = z
  .object({ displayName: z.string().min(1).max(64) })
  .passthrough();
const SendAuthCodeRequestBody = z.object({ email: z.string() }).passthrough();
const SocialLinkingResult = z
  .object({
    provider: z.string(),
    email: z.string(),
    expiresAt: KPool_Common_Timestamp,
  })
  .passthrough();
const SendSocialLinkingEmailResult = z
  .object({ accepted: z.boolean() })
  .passthrough();
const VerifySocialLinkingEmailRequestBody = z
  .object({ authCode: z.string().regex(/^[0-9]{6}$/) })
  .passthrough();
const CompleteStepUpWithPasskeyRequestBody = z
  .object({
    challengeKey: KPool_Common_Uuid.uuid(),
    credential: PasskeyAuthenticationCredential,
  })
  .passthrough();
const VerifyEmailRequestBody = z
  .object({ email: z.string(), authCode: z.string() })
  .passthrough();
const VerifyEmailResult = z
  .object({ email: z.string(), verifiedAt: KPool_Common_Timestamp.nullish() })
  .passthrough();
const WithdrawFromServiceRequestBody = z
  .object({ confirmationIdentityName: z.string().min(1).max(32) })
  .passthrough();
const UpdateIdentityRequestBody = z
  .object({
    identityName: z.string().nullable(),
    language: z.string().nullable(),
    base64EncodedImage: z.string().nullable(),
  })
  .partial()
  .passthrough();
const WithdrawalEligibility = z
  .object({ canWithdraw: z.boolean() })
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
    type: z.string().nullable(),
    name: z.string(),
    status: z.string(),
    accountCategory: z.string(),
    phone: z.string().nullish(),
    address: AuthenticatedAccountAddressSummary.nullish(),
  })
  .passthrough();
const AuthenticationMethodsSummary = z
  .object({
    passkeyCount: z.number().int(),
    linkedSocialProviders: z.array(z.string()),
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
  KPool_Common_ProblemDetails,
  KPool_Common_Uuid,
  IdentityProfileSummary,
  EmptyJsonArray,
  IdentitySummary,
  AuthenticatedIdentitySummary,
  KPool_Common_Timestamp,
  PasskeySummary,
  PasskeyListResult,
  PasskeyAuthenticatorAttestationResponse,
  KPool_Common_EmptyJsonObject,
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
  RecoverPasskeyRequestBody,
  SendPasskeyRecoveryEmailRequestBody,
  VerifyPasskeyRecoveryEmailRequestBody,
  PasskeyRecoveryVerificationResult,
  CreatePasskeyRecoveryOptionsRequestBody,
  RedirectUrlResult,
  RegisterWithPasskeyRequestBody,
  PasskeyIdentityRegistrationResult,
  CreatePasskeyRegistrationOptionsRequestBody,
  UpdatePasskeyRequestBody,
  SendAuthCodeRequestBody,
  SocialLinkingResult,
  SendSocialLinkingEmailResult,
  VerifySocialLinkingEmailRequestBody,
  CompleteStepUpWithPasskeyRequestBody,
  VerifyEmailRequestBody,
  VerifyEmailResult,
  WithdrawFromServiceRequestBody,
  UpdateIdentityRequestBody,
  WithdrawalEligibility,
  AccountPolicyConditionClause,
  AccountPolicyCondition,
  AccountPolicyStatement,
  AccountEffectivePolicySummary,
  AuthenticatedAccountAddressSummary,
  AuthenticatedAccountReferenceSummary,
  AuthenticatedAccountSummary,
  AuthenticationMethodsSummary,
  SwitchableAccountSummary,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/auth/csrf-token",
    alias: "IdentityAuthOperations_getCsrfToken",
    description: `Safely initialize browser CSRF protection without requiring login. Laravel issues XSRF-TOKEN and the session cookie using Set-Cookie; the empty response is not cacheable. Keep both cookies and send the URL-decoded XSRF-TOKEN cookie value in X-XSRF-TOKEN for session API mutations. This endpoint changes no identity or account data. Use these cookies and the X-XSRF-TOKEN header for all session API mutations, including login and signup.`,
    requestFormat: "json",
    response: z.void(),
    errors: [
      {
        status: 500,
        description: `Server error`,
        schema: KPool_Common_ProblemDetails,
      },
    ],
  },
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
    path: "/auth/logout",
    alias: "IdentityAuthOperations_logout",
    description: `Log out the current authenticated identity.`,
    requestFormat: "json",
    response: z.array(z.unknown()),
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
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
    description: `List passkeys registered by the current authenticated identity after recent authentication.`,
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
    method: "patch",
    path: "/auth/passkeys/:passkeyIdentifier",
    alias: "IdentityAuthOperations_updatePasskey",
    description: `Update a passkey belonging to the authenticated identity after recent authentication.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ displayName: z.string().min(1).max(64) })
          .passthrough(),
      },
      {
        name: "passkeyIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.array(z.unknown()),
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
        status: 419,
        description: `Client error`,
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
    path: "/auth/passkeys/:passkeyIdentifier",
    alias: "IdentityAuthOperations_deletePasskey",
    description: `Delete a passkey belonging to the authenticated identity while preserving another authentication method.`,
    requestFormat: "json",
    parameters: [
      {
        name: "passkeyIdentifier",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.array(z.unknown()),
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
        status: 419,
        description: `Client error`,
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
    response: z.array(z.unknown()),
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
        status: 419,
        description: `Client error`,
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
        status: 419,
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
        status: 419,
        description: `Client error`,
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
        status: 419,
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
    path: "/auth/passkeys/recovery",
    alias: "IdentityAuthOperations_recoverPasskey",
    description: `Register a replacement passkey, remove all previous passkeys, and invalidate existing login sessions.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RecoverPasskeyRequestBody,
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
        status: 419,
        description: `Client error`,
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
    path: "/auth/passkeys/recovery/email",
    alias: "IdentityAuthOperations_sendPasskeyRecoveryEmail",
    description: `Send a passkey recovery code while returning the same response whether or not the email is registered.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ email: z.string() }).passthrough(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 419,
        description: `Client error`,
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
    path: "/auth/passkeys/recovery/email/verification",
    alias: "IdentityAuthOperations_verifyPasskeyRecoveryEmail",
    description: `Verify a passkey recovery email code and issue a short-lived recovery key.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: VerifyPasskeyRecoveryEmailRequestBody,
      },
    ],
    response: PasskeyRecoveryVerificationResult,
    errors: [
      {
        status: 419,
        description: `Client error`,
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
    path: "/auth/passkeys/recovery/options",
    alias: "IdentityAuthOperations_createPasskeyRecoveryOptions",
    description: `Create WebAuthn registration options authorized by a passkey recovery key.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreatePasskeyRecoveryOptionsRequestBody,
      },
    ],
    response: PasskeyRegistrationOptionsResult,
    errors: [
      {
        status: 404,
        description: `The server cannot find the requested resource.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
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
    path: "/auth/passkeys/recovery/social/:provider/redirect",
    alias: "IdentityAuthOperations_startPasskeyRecoveryWithSocial",
    description: `Create a social reauthentication URL. Identify the recovery target from the linked social account on callback.`,
    requestFormat: "json",
    parameters: [
      {
        name: "provider",
        type: "Path",
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
    method: "post",
    path: "/auth/passkeys/registration",
    alias: "IdentityAuthOperations_registerWithPasskey",
    description: `Verify a WebAuthn attestation, create an identity and establish an authenticated session.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RegisterWithPasskeyRequestBody,
      },
    ],
    response: PasskeyIdentityRegistrationResult,
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
        status: 419,
        description: `Client error`,
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
        status: 419,
        description: `Client error`,
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
    response: z.void(),
    errors: [
      {
        status: 419,
        description: `Client error`,
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
    path: "/auth/social/:provider/callback",
    alias: "IdentityAuthOperations_socialLoginCallback",
    description: `Handle OAuth and redirect the browser. An unlinked provider whose email matches an existing identity redirects to the frontend /auth/social/link confirmation screen, retaining server-side pending data for ten minutes in the originating Laravel session. No linking or login occurs before dedicated email verification. Linked login, new identity, invitation, step-up and passkey recovery flows retain their existing redirects.`,
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
    response: z.void(),
    errors: [
      {
        status: 302,
        description: `Actual browser redirect returned by the OAuth callback.`,
        schema: z.void(),
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
    method: "get",
    path: "/auth/social/link",
    alias: "IdentityAuthOperations_getSocialLinking",
    description: `Read pending SSO linking confirmation using the originating Laravel session cookie. Returns 422 when absent, expired, consumed, or accessed from another session. No provider, identity, email, return path or pending key is accepted from the client.`,
    requestFormat: "json",
    response: SocialLinkingResult,
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
    path: "/auth/social/link/email",
    alias: "IdentityAuthOperations_sendSocialLinkingEmail",
    description: `Request a dedicated code for the pending target&#x27;s registered email using the same session cookie. No request body is required. Codes expire with the ten-minute pending operation; a successful resend invalidates the old code without resetting failed attempts. A 60-second cooldown and a maximum of five sends per pending operation and per target identity per hour apply; throttled requests return accepted&#x3D;true without a new code. Invalid or expired pending operations return 422.`,
    requestFormat: "json",
    response: z.object({ accepted: z.boolean() }).passthrough(),
    errors: [
      {
        status: 419,
        description: `Client error`,
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
    path: "/auth/social/link/email/verification",
    alias: "IdentityAuthOperations_verifySocialLinkingEmail",
    description: `Verify the dedicated code and consume pending authorization in the originating Laravel session. Re-fetch and check the target and SSO ownership, save the addition and log in with a regenerated session ID within an Action-managed database transaction. Returns an allowed frontend return path. Invalid codes, expiry, five failed attempts, reuse and linking conflicts return 422. A save failure never logs in; the authorization remains consumed and OAuth must be restarted before retrying.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ authCode: z.string().regex(/^[0-9]{6}$/) })
          .passthrough(),
      },
    ],
    response: z.object({ redirectUrl: z.string() }).passthrough(),
    errors: [
      {
        status: 419,
        description: `Client error`,
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
    path: "/auth/step-up/passkey",
    alias: "IdentityAuthOperations_completeStepUpWithPasskey",
    description: `Verify an existing passkey and grant common recent authentication to the same identity and login session for ten minutes from verification. Passkey operations and identity withdrawal share this result without consuming it or extending its expiry.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CompleteStepUpWithPasskeyRequestBody,
      },
    ],
    response: z.array(z.unknown()),
    errors: [
      {
        status: 401,
        description: `Access is unauthorized.`,
        schema: KPool_Common_ProblemDetails,
      },
      {
        status: 419,
        description: `Client error`,
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
    path: "/auth/step-up/passkey/options",
    alias: "IdentityAuthOperations_createStepUpPasskeyOptions",
    description: `Create identity-bound WebAuthn options for common recent authentication.`,
    requestFormat: "json",
    response: PasskeyAuthenticationOptionsResult,
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
        status: 419,
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
    path: "/auth/step-up/social/:provider/redirect",
    alias: "IdentityAuthOperations_startStepUpWithSocial",
    description: `Create a linked-SSO recent authentication URL when no passkey is registered. Persist the allowlisted return destination in the originating login session on the server. The result is reusable for ten minutes by the same identity and login session without consumption or extension.`,
    requestFormat: "json",
    parameters: [
      {
        name: "provider",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "returnTo",
        type: "Query",
        schema: z.enum(["passkeys", "withdrawal"]),
      },
    ],
    response: z.object({ redirectUrl: z.string() }).passthrough(),
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
        status: 419,
        description: `Client error`,
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
    path: "/identities/me",
    alias: "IdentityOperations_withdrawFromService",
    description: `Permanently withdraw from the service and delete the authenticated identity. Laravel CSRF protection is required for this route, including POST method override; first GET /api/identity/auth/csrf-token, retain its cookies and send the URL-decoded XSRF-TOKEN cookie in X-XSRF-TOKEN (419 csrf_token_mismatch on failure). Post-commit cleanup and outer session-save failures are logged and do not change the committed 204 result. Requires reusable recent authentication from the same identity and login session within ten minutes, shared with passkey operations without consumption or extension. GENERAL individual accounts (including Owners) and GENERAL corporate non-Owners are eligible only when no corporate account email matches the identity email case-insensitively, regardless of role. Archives contain allowlisted internal identifiers and metadata only. Corporate accounts remain; individual accounts are archived and deleted. All login sessions are invalidated after commit. Requires confirmationIdentityName to exactly match the current stored identity name, including whitespace and case, before any withdrawal side effect. Missing or invalid confirmation returns 422; mismatch returns 422 identity_name_confirmation_mismatch. No target identity identifier is accepted. 401 code is authentication_required for missing login or recent_authentication_required for missing recent authentication; 403 code is identity_withdrawal_not_allowed.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ confirmationIdentityName: z.string().min(1).max(32) })
          .passthrough(),
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
        status: 419,
        description: `Client error`,
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
        status: 419,
        description: `Client error`,
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
    path: "/identities/me/withdrawal-eligibility",
    alias: "IdentityOperations_getWithdrawalEligibility",
    description: `Check self-service withdrawal eligibility against every actual membership using the same rules as withdrawal. Any corporate membership whose account email matches the identity email case-insensitively blocks self-service withdrawal regardless of role. Does not require recent authentication and does not mutate data.`,
    requestFormat: "json",
    response: z.object({ canWithdraw: z.boolean() }).passthrough(),
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
]);

export const identityApi = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
