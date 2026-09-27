import {
  parseIdentitySummary,
  parsePasskeyAuthenticationOptionsResult,
  parsePasskeyListResult,
  parsePasskeyRecoveryVerificationResult,
  parsePasskeyRegistrationOptionsResult,
  parseRedirectUrlResult,
  type AddPasskeyRequest,
  type AuthenticateWithPasskeyRequest,
  type CompleteStepUpWithPasskeyRequest,
  type CreatePasskeyRecoveryOptionsRequest,
  type CreatePasskeyRegistrationOptionsRequest,
  type IdentitySummary,
  type PasskeyAuthenticationOptionsResult,
  type PasskeyListResult,
  type PasskeyRecoveryVerificationResult,
  type PasskeyRegistrationOptionsResult,
  type RecoverPasskeyRequest,
  type RedirectUrlResult,
  type RegisterWithPasskeyRequest,
  type SendPasskeyRecoveryEmailRequest,
  type UpdatePasskeyRequest,
  type VerifyPasskeyRecoveryEmailRequest,
} from "@/gateways/identity/identityApi";

import { requestIdentity as request, type IdentityBrowserApiResult } from "./identityBrowserRequest";
export type { IdentityBrowserApiResult } from "./identityBrowserRequest";

const parseEmpty = (): Record<string, never> => ({});

export const passkeyBrowserApi = {
  createAuthenticationOptions: () =>
    request(
      "/api/identity/auth/passkeys/authentication/options",
      parsePasskeyAuthenticationOptionsResult,
    ),
  authenticate: (body: AuthenticateWithPasskeyRequest, language?: string) =>
    request(
      "/api/identity/auth/passkeys/authentication",
      parseIdentitySummary,
      { body, language },
    ),
  createRegistrationOptions: (
    body: CreatePasskeyRegistrationOptionsRequest,
    language?: string,
  ) => request(
    "/api/identity/auth/passkeys/registration/options",
    parsePasskeyRegistrationOptionsResult,
    { body, language },
  ),
  register: (body: RegisterWithPasskeyRequest, language?: string) =>
    request(
      "/api/identity/auth/passkeys/registration",
      parseIdentitySummary,
      { body, language },
    ),
  list: () => request(
    "/api/identity/auth/passkeys",
    parsePasskeyListResult,
    { method: "GET" },
  ),
  createAdditionOptions: () => request(
    "/api/identity/auth/passkeys/addition/options",
    parsePasskeyRegistrationOptionsResult,
  ),
  createStepUpPasskeyOptions: () => request(
    "/api/identity/auth/step-up/passkey/options",
    parsePasskeyAuthenticationOptionsResult,
  ),
  completeStepUpWithPasskey: (body: CompleteStepUpWithPasskeyRequest) => request(
    "/api/identity/auth/step-up/passkey",
    parseEmpty,
    { body },
  ),
  createStepUpSocialRedirect: (provider: "google" | "line" | "kakao") => request(
    `/api/identity/auth/step-up/social/${encodeURIComponent(provider)}/redirect`,
    parseRedirectUrlResult,
    { method: "GET" },
  ),
  sendRecoveryEmail: (body: SendPasskeyRecoveryEmailRequest, language?: string) => request(
    "/api/identity/auth/passkeys/recovery/email",
    parseEmpty,
    { body, language },
  ),
  verifyRecoveryEmail: (body: VerifyPasskeyRecoveryEmailRequest, language?: string) => request(
    "/api/identity/auth/passkeys/recovery/email/verification",
    parsePasskeyRecoveryVerificationResult,
    { body, language },
  ),
  createRecoverySocialRedirect: (
    provider: "google" | "line" | "kakao",
    language?: string,
  ) => request(
    `/api/identity/auth/passkeys/recovery/social/${encodeURIComponent(provider)}/redirect`,
    parseRedirectUrlResult,
    { language, method: "GET" },
  ),
  createRecoveryOptions: (body: CreatePasskeyRecoveryOptionsRequest, language?: string) => request(
    "/api/identity/auth/passkeys/recovery/options",
    parsePasskeyRegistrationOptionsResult,
    { body, language },
  ),
  recover: (body: RecoverPasskeyRequest, language?: string) => request(
    "/api/identity/auth/passkeys/recovery",
    parseEmpty,
    { body, language },
  ),
  add: (body: AddPasskeyRequest) => request(
    "/api/identity/auth/passkeys/addition",
    parseEmpty,
    { body },
  ),
  update: (passkeyIdentifier: string, body: UpdatePasskeyRequest) => request(
    `/api/identity/auth/passkeys/${encodeURIComponent(passkeyIdentifier)}`,
    parseEmpty,
    { body, method: "PATCH" },
  ),
  delete: (passkeyIdentifier: string) => request(
    `/api/identity/auth/passkeys/${encodeURIComponent(passkeyIdentifier)}`,
    parseEmpty,
    { method: "DELETE" },
  ),
};

export type PasskeyBrowserApi = {
  createAuthenticationOptions: () => Promise<IdentityBrowserApiResult<PasskeyAuthenticationOptionsResult>>;
  authenticate: (body: AuthenticateWithPasskeyRequest, language?: string) => Promise<IdentityBrowserApiResult<IdentitySummary>>;
  createRegistrationOptions: (body: CreatePasskeyRegistrationOptionsRequest, language?: string) => Promise<IdentityBrowserApiResult<PasskeyRegistrationOptionsResult>>;
  register: (body: RegisterWithPasskeyRequest, language?: string) => Promise<IdentityBrowserApiResult<IdentitySummary>>;
  list: () => Promise<IdentityBrowserApiResult<PasskeyListResult>>;
  createAdditionOptions: () => Promise<IdentityBrowserApiResult<PasskeyRegistrationOptionsResult>>;
  createStepUpPasskeyOptions: () => Promise<IdentityBrowserApiResult<PasskeyAuthenticationOptionsResult>>;
  completeStepUpWithPasskey: (body: CompleteStepUpWithPasskeyRequest) => Promise<IdentityBrowserApiResult<Record<string, never>>>;
  createStepUpSocialRedirect: (provider: "google" | "line" | "kakao") => Promise<IdentityBrowserApiResult<RedirectUrlResult>>;
  sendRecoveryEmail: (body: SendPasskeyRecoveryEmailRequest, language?: string) => Promise<IdentityBrowserApiResult<Record<string, never>>>;
  verifyRecoveryEmail: (body: VerifyPasskeyRecoveryEmailRequest, language?: string) => Promise<IdentityBrowserApiResult<PasskeyRecoveryVerificationResult>>;
  createRecoverySocialRedirect: (provider: "google" | "line" | "kakao", language?: string) => Promise<IdentityBrowserApiResult<RedirectUrlResult>>;
  createRecoveryOptions: (body: CreatePasskeyRecoveryOptionsRequest, language?: string) => Promise<IdentityBrowserApiResult<PasskeyRegistrationOptionsResult>>;
  recover: (body: RecoverPasskeyRequest, language?: string) => Promise<IdentityBrowserApiResult<Record<string, never>>>;
  add: (body: AddPasskeyRequest) => Promise<IdentityBrowserApiResult<Record<string, never>>>;
  update: (passkeyIdentifier: string, body: UpdatePasskeyRequest) => Promise<IdentityBrowserApiResult<Record<string, never>>>;
  delete: (passkeyIdentifier: string) => Promise<IdentityBrowserApiResult<Record<string, never>>>;
};
