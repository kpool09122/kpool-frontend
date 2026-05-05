import { schemas } from "@kpool/types/account-api";
import { z } from "zod";

export type CreateAccountRequest = z.infer<typeof schemas.CreateAccountRequestBody>;
export type CreateAccountResult = z.infer<typeof schemas.CreateAccountResult>;

type AccountApiEnv = Record<string, string | undefined>;

const trimTrailingSlashes = (value: string): string => {
  let trimmedValue = value;

  while (trimmedValue.endsWith("/")) {
    trimmedValue = trimmedValue.slice(0, -1);
  }

  return trimmedValue;
};

export const withAccountApiPrefix = (baseUrl: string): string =>
  baseUrl.endsWith("/api/account")
    ? baseUrl
    : `${trimTrailingSlashes(baseUrl)}/api/account`;

export const getAccountApiBaseUrl = (
  env: AccountApiEnv = process.env,
): string | null =>
  env.KPOOL_ACCOUNT_API_BASE_URL
    ? withAccountApiPrefix(env.KPOOL_ACCOUNT_API_BASE_URL)
    : null;

export const parseCreateAccountRequest = (body: unknown): CreateAccountRequest =>
  schemas.CreateAccountRequestBody.parse(body);

export const parseCreateAccountResult = (body: unknown): CreateAccountResult =>
  schemas.CreateAccountResult.parse(Array.isArray(body) && body.length === 0 ? {} : body);
