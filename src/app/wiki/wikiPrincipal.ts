import { schemas } from "@kpool/types/wiki-private-api";
import type { IdentitySummary } from "../identityApi";
import { z } from "zod";

import {
  getWikiApiErrorMessage,
  trimTrailingSlashes,
  withWikiApiPrefix,
} from "./wikiApiModel";

export const wikiPrincipalSummarySchema = schemas.PrincipalSummary;
export const wikiPrincipalCreateRequestSchema = schemas.CreatePrincipalRequestBody;

export type WikiPrincipalSummary = z.infer<typeof wikiPrincipalSummarySchema>;
export type WikiPrincipalCreateRequest = z.infer<typeof wikiPrincipalCreateRequestSchema>;

export type WikiPrincipalState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "available"; principal: WikiPrincipalSummary }
  | { status: "missing" }
  | { status: "error"; message: string };

type FetchAdapter = typeof fetch;

type ResponseLike = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export const getWikiPrincipalApiBaseUrl = (): string =>
  process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL
    ? withWikiApiPrefix(process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL)
    : "";

export const getAccountIdentifierFromIdentity = (
  identity: IdentitySummary | null,
): string | null => {
  if (!identity) {
    return null;
  }

  const accountIdentifier = (identity as IdentitySummary & {
    accountIdentifier?: unknown;
  }).accountIdentifier;

  return typeof accountIdentifier === "string" && accountIdentifier.length > 0
    ? accountIdentifier
    : null;
};

const readResponseBody = async (response: ResponseLike): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const toWikiPrincipalMessage = (error: unknown): string =>
  getWikiApiErrorMessage(error, {
    notFound: "Wiki principal was not found.",
    requestFailedPrefix: "Wiki principal request failed with status",
    responseSchemaPrefix: "Wiki principal response did not match the expected schema",
    unavailable: "Wiki principal is temporarily unavailable. Please try again later.",
  });

export const getWikiPrincipalErrorMessage = toWikiPrincipalMessage;

export const getCurrentWikiPrincipal = async ({
  fetchAdapter = fetch,
}: {
  fetchAdapter?: FetchAdapter;
} = {}): Promise<Extract<WikiPrincipalState, { status: "available" | "missing" | "error" }>> => {
  try {
    const response = await fetchAdapter("/api/wiki/principal/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const body = await readResponseBody(response);

    if (response.status === 404) {
      return { status: "missing" };
    }

    if (!response.ok) {
      return {
        status: "error",
        message: toWikiPrincipalMessage({
          response: { status: response.status, data: body },
        }),
      };
    }

    return {
      status: "available",
      principal: wikiPrincipalSummarySchema.parse(body),
    };
  } catch (error) {
    return {
      status: "error",
      message: toWikiPrincipalMessage(error),
    };
  }
};

export const createWikiPrincipal = async ({
  accountIdentifier,
  fetchAdapter = fetch,
  identityIdentifier,
}: WikiPrincipalCreateRequest & {
  fetchAdapter?: FetchAdapter;
}): Promise<Extract<WikiPrincipalState, { status: "available" | "error" }>> => {
  try {
    const body = wikiPrincipalCreateRequestSchema.parse({
      accountIdentifier,
      identityIdentifier,
    });
    const response = await fetchAdapter("/api/wiki/principal/create", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const responseBody = await readResponseBody(response);

    if (!response.ok) {
      return {
        status: "error",
        message: toWikiPrincipalMessage({
          response: { status: response.status, data: responseBody },
        }),
      };
    }

    return {
      status: "available",
      principal: wikiPrincipalSummarySchema.parse(responseBody),
    };
  } catch (error) {
    return {
      status: "error",
      message: toWikiPrincipalMessage(error),
    };
  }
};

export const createWikiCurrentPrincipalUrl = (baseUrl: string): string =>
  `${trimTrailingSlashes(baseUrl)}/principal/me`;

export const createWikiPrincipalCreateUrl = (baseUrl: string): string =>
  `${trimTrailingSlashes(baseUrl)}/principal/create`;
