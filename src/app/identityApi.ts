import { schemas } from "@kpool/types/identity-api";
import { z } from "zod";

export type IdentityLoginRequest = z.infer<typeof schemas.LoginRequestBody>;
export type IdentitySummary = z.infer<typeof schemas.IdentitySummary>;
export type RedirectUrlResult = z.infer<typeof schemas.RedirectUrlResult>;
export type CreateIdentityRequest = z.infer<typeof schemas.CreateIdentityRequestBody>;
export type VerifyEmailRequest = z.infer<typeof schemas.VerifyEmailRequestBody>;
export type VerifyEmailResult = z.infer<typeof schemas.VerifyEmailResult>;

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

export const getIdentityRouteErrorMessage = ({
  status,
  data,
}: ProblemResponse): string => {
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
  schemas.LoginRequestBody.parse(body);

export const parseIdentitySummary = (body: unknown): IdentitySummary =>
  schemas.IdentitySummary.parse(body);

export const parseRedirectUrlResult = (body: unknown): RedirectUrlResult =>
  schemas.RedirectUrlResult.parse(body);

export const parseCreateIdentityRequest = (body: unknown): CreateIdentityRequest =>
  schemas.CreateIdentityRequestBody.parse(body);

export const parseVerifyEmailRequest = (body: unknown): VerifyEmailRequest =>
  schemas.VerifyEmailRequestBody.parse(body);

export const parseVerifyEmailResult = (body: unknown): VerifyEmailResult =>
  schemas.VerifyEmailResult.parse(body);
