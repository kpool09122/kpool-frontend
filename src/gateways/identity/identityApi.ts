import { identityApiTypes } from "@kpool/types";
import { z } from "zod";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

export type IdentityLoginRequest = z.infer<typeof identityApiTypes.schemas.LoginRequestBody>;
export type IdentitySummary = z.infer<typeof identityApiTypes.schemas.IdentitySummary>;
export type RedirectUrlResult = z.infer<typeof identityApiTypes.schemas.RedirectUrlResult>;
export type CreateIdentityRequest = z.infer<typeof identityApiTypes.schemas.CreateIdentityRequestBody>;
export type VerifyEmailRequest = z.infer<typeof identityApiTypes.schemas.VerifyEmailRequestBody>;
export type VerifyEmailResult = z.infer<typeof identityApiTypes.schemas.VerifyEmailResult>;
export type UpdateIdentityRequest = z.infer<typeof identityApiTypes.schemas.UpdateIdentityRequestBody>;

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

  if (status === 401) {
    return "メールアドレスまたはパスワードが違います。";
  }

  return status
    ? `Identity API request failed with status ${status}.`
    : "Identity API is temporarily unavailable.";
};

export const parseIdentityLoginRequest = (body: unknown): IdentityLoginRequest =>
  parseWithSchemaLog("identity login request", identityApiTypes.schemas.LoginRequestBody, body);

export const parseIdentitySummary = (body: unknown): IdentitySummary =>
  parseWithSchemaLog("identity summary", identityApiTypes.schemas.IdentitySummary, body);

export const parseRedirectUrlResult = (body: unknown): RedirectUrlResult =>
  parseWithSchemaLog("identity redirect url response", identityApiTypes.schemas.RedirectUrlResult, body);

export const parseCreateIdentityRequest = (body: unknown): CreateIdentityRequest =>
  parseWithSchemaLog("identity create request", identityApiTypes.schemas.CreateIdentityRequestBody, body);

export const parseVerifyEmailRequest = (body: unknown): VerifyEmailRequest =>
  parseWithSchemaLog("identity verify email request", identityApiTypes.schemas.VerifyEmailRequestBody, body);

export const parseUpdateIdentityRequest = (body: unknown): UpdateIdentityRequest =>
  parseWithSchemaLog("identity update request", identityApiTypes.schemas.UpdateIdentityRequestBody, body);

export const parseUpdateIdentityResult = (body: unknown): IdentitySummary =>
  parseWithSchemaLog("identity update response", identityApiTypes.schemas.IdentitySummary, body);

export const parseVerifyEmailResult = (body: unknown): VerifyEmailResult =>
  parseWithSchemaLog("identity verify email response", identityApiTypes.schemas.VerifyEmailResult, body);
