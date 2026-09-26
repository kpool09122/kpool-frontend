import { identityApiTypes } from "@kpool/types";
import { z } from "zod";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

export type IdentitySummary = z.infer<typeof identityApiTypes.schemas.IdentitySummary>;
const AuthenticatedIdentitySummarySchema = identityApiTypes.schemas.IdentitySummary.extend({
  accountIdentifier: z.string().uuid().nullable(),
  accountPrincipalIdentifier: z.string().uuid().nullable(),
  accountType: z.string().nullable(),
  accountPolicies: z.array(identityApiTypes.schemas.AccountEffectivePolicySummary),
  account: identityApiTypes.schemas.AuthenticatedAccountSummary.nullish(),
  originalAccount: identityApiTypes.schemas.AuthenticatedAccountReferenceSummary.nullable(),
  delegationIdentifier: z.string().uuid().nullable(),
  switchableAccounts: z.array(identityApiTypes.schemas.SwitchableAccountSummary),
});
export type AuthenticatedIdentitySummary = z.infer<typeof AuthenticatedIdentitySummarySchema>;
export type RedirectUrlResult = z.infer<typeof identityApiTypes.schemas.RedirectUrlResult>;
export type VerifyEmailRequest = z.infer<typeof identityApiTypes.schemas.VerifyEmailRequestBody>;
export type VerifyEmailResult = z.infer<typeof identityApiTypes.schemas.VerifyEmailResult>;
export type UpdateIdentityRequest = z.infer<typeof identityApiTypes.schemas.UpdateIdentityRequestBody>;
export type SendAuthCodeRequest = z.infer<typeof identityApiTypes.schemas.SendAuthCodeRequestBody>;
export type PasskeySummary = z.infer<typeof identityApiTypes.schemas.PasskeySummary>;
export type PasskeyListResult = z.infer<typeof identityApiTypes.schemas.PasskeyListResult>;
export type PasskeyRegistrationOptionsResult = z.infer<typeof identityApiTypes.schemas.PasskeyRegistrationOptionsResult>;
export type PasskeyAuthenticationOptionsResult = z.infer<typeof identityApiTypes.schemas.PasskeyAuthenticationOptionsResult>;
export type PasskeyRegistrationCredential = z.infer<typeof identityApiTypes.schemas.PasskeyRegistrationCredential>;
export type PasskeyAuthenticationCredential = z.infer<typeof identityApiTypes.schemas.PasskeyAuthenticationCredential>;
export type CreatePasskeyRegistrationOptionsRequest = z.infer<typeof identityApiTypes.schemas.CreatePasskeyRegistrationOptionsRequestBody>;
export type RegisterWithPasskeyRequest = z.infer<typeof identityApiTypes.schemas.RegisterWithPasskeyRequestBody>;
export type AuthenticateWithPasskeyRequest = z.infer<typeof identityApiTypes.schemas.AuthenticateWithPasskeyRequestBody>;
export type AddPasskeyRequest = z.infer<typeof identityApiTypes.schemas.AddPasskeyRequestBody>;
export type UpdatePasskeyRequest = z.infer<typeof identityApiTypes.schemas.UpdatePasskeyRequestBody>;

type IdentityApiEnv = Record<string, string | undefined>;

type ProblemResponse = {
  status?: number;
  data?: unknown;
};

const trimTrailingSlashes = (value: string): string => {
  let trimmedValue = value;

  while (trimmedValue.endsWith("/")) {
    trimmedValue = trimmedValue.slice(0, -1);
  }

  return trimmedValue;
};

const hasMessage = (value: unknown): value is { message: string } =>
  typeof value === "object" &&
  value !== null &&
  "message" in value &&
  typeof (value as { message: unknown }).message === "string";

const hasDetail = (value: unknown): value is { detail: string } =>
  typeof value === "object" &&
  value !== null &&
  "detail" in value &&
  typeof (value as { detail: unknown }).detail === "string";

export const withIdentityApiPrefix = (baseUrl: string): string =>
  baseUrl.endsWith("/api/identity")
    ? baseUrl
    : `${trimTrailingSlashes(baseUrl)}/api/identity`;

export const getIdentityApiBaseUrl = (
  env: IdentityApiEnv = process.env,
): string | null =>
  env.KPOOL_IDENTITY_API_BASE_URL
    ? withIdentityApiPrefix(env.KPOOL_IDENTITY_API_BASE_URL)
    : null;

export const stripIdentityImageDataUrlPrefix = (value: string): string => {
  const marker = ";base64,";
  const markerIndex = value.indexOf(marker);

  return markerIndex >= 0 ? value.slice(markerIndex + marker.length) : value;
};

export const normalizeIdentityImageRequest = <
  T extends { base64EncodedImage?: string | null },
>(requestBody: T): T => {
  if (!requestBody.base64EncodedImage) {
    return requestBody;
  }

  return {
    ...requestBody,
    base64EncodedImage: stripIdentityImageDataUrlPrefix(requestBody.base64EncodedImage),
  };
};

export const getIdentityRouteErrorMessage = ({
  status,
  data,
}: ProblemResponse): string => {
  if (status && status >= 500) {
    return "Identity API is temporarily unavailable.";
  }

  if (hasMessage(data)) {
    return data.message;
  }

  if (hasDetail(data)) {
    return data.detail;
  }

  return status
    ? `Identity API request failed with status ${status}.`
    : "Identity API is temporarily unavailable.";
};

export const parseIdentitySummary = (body: unknown): IdentitySummary =>
  parseWithSchemaLog("identity summary", identityApiTypes.schemas.IdentitySummary, body);

export const parseAuthenticatedIdentitySummary = (body: unknown): AuthenticatedIdentitySummary =>
  parseWithSchemaLog("authenticated identity summary", AuthenticatedIdentitySummarySchema, body);

export const parseRedirectUrlResult = (body: unknown): RedirectUrlResult =>
  parseWithSchemaLog("identity redirect url response", identityApiTypes.schemas.RedirectUrlResult, body);

export const parseVerifyEmailRequest = (body: unknown): VerifyEmailRequest =>
  parseWithSchemaLog("identity verify email request", identityApiTypes.schemas.VerifyEmailRequestBody, body);

export const parseUpdateIdentityRequest = (body: unknown): UpdateIdentityRequest =>
  parseWithSchemaLog("identity update request", identityApiTypes.schemas.UpdateIdentityRequestBody, body);

export const parseUpdateIdentityResult = (body: unknown): IdentitySummary =>
  parseWithSchemaLog("identity update response", identityApiTypes.schemas.IdentitySummary, body);

export const parseVerifyEmailResult = (body: unknown): VerifyEmailResult =>
  parseWithSchemaLog("identity verify email response", identityApiTypes.schemas.VerifyEmailResult, body);

export const parseSendAuthCodeRequest = (body: unknown): SendAuthCodeRequest =>
  parseWithSchemaLog("identity send auth code request", identityApiTypes.schemas.SendAuthCodeRequestBody, body);

export const parsePasskeyListResult = (body: unknown): PasskeyListResult =>
  parseWithSchemaLog("identity passkey list response", identityApiTypes.schemas.PasskeyListResult, body);

export const parsePasskeyRegistrationOptionsResult = (body: unknown): PasskeyRegistrationOptionsResult =>
  parseWithSchemaLog("identity passkey registration options response", identityApiTypes.schemas.PasskeyRegistrationOptionsResult, body);

export const parsePasskeyAuthenticationOptionsResult = (body: unknown): PasskeyAuthenticationOptionsResult =>
  parseWithSchemaLog("identity passkey authentication options response", identityApiTypes.schemas.PasskeyAuthenticationOptionsResult, body);

export const parsePasskeyRegistrationOptionsRequest = (body: unknown): CreatePasskeyRegistrationOptionsRequest =>
  parseWithSchemaLog("identity passkey registration options request", identityApiTypes.schemas.CreatePasskeyRegistrationOptionsRequestBody, body);

export const parseRegisterWithPasskeyRequest = (body: unknown): RegisterWithPasskeyRequest =>
  parseWithSchemaLog("identity passkey registration request", identityApiTypes.schemas.RegisterWithPasskeyRequestBody, normalizeIdentityImageRequest(body as RegisterWithPasskeyRequest));

export const parseAuthenticateWithPasskeyRequest = (body: unknown): AuthenticateWithPasskeyRequest =>
  parseWithSchemaLog("identity passkey authentication request", identityApiTypes.schemas.AuthenticateWithPasskeyRequestBody, body);

export const parseAddPasskeyRequest = (body: unknown): AddPasskeyRequest =>
  parseWithSchemaLog("identity add passkey request", identityApiTypes.schemas.AddPasskeyRequestBody, body);

export const parseUpdatePasskeyRequest = (body: unknown): UpdatePasskeyRequest =>
  parseWithSchemaLog("identity update passkey request", identityApiTypes.schemas.UpdatePasskeyRequestBody, body);

export const parsePasskeyRegistrationCredential = (body: unknown): PasskeyRegistrationCredential =>
  parseWithSchemaLog("identity passkey registration credential", identityApiTypes.schemas.PasskeyRegistrationCredential, body);

export const parsePasskeyAuthenticationCredential = (body: unknown): PasskeyAuthenticationCredential =>
  parseWithSchemaLog("identity passkey authentication credential", identityApiTypes.schemas.PasskeyAuthenticationCredential, body);
