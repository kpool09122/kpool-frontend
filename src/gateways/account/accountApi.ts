import { accountApiTypes } from "@kpool/types";
import { z } from "zod";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

export type CreateAccountRequest = z.infer<typeof accountApiTypes.schemas.CreateAccountRequestBody>;
export type CreateAccountResult = z.infer<typeof accountApiTypes.schemas.CreateAccountResult>;

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
  parseWithSchemaLog("account create request", accountApiTypes.schemas.CreateAccountRequestBody, body);

export const parseCreateAccountResult = (body: unknown): CreateAccountResult =>
  parseWithSchemaLog("account create response", accountApiTypes.schemas.CreateAccountResult, Array.isArray(body) && body.length === 0 ? {} : body);
