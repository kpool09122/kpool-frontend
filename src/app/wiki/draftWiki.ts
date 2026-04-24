import { type WikiBasic, type WikiDetail, wikiDetailSchema } from "@kpool/wiki";
import {
  createApiClient,
  schemas,
} from "@kpool/types/wiki-private-api";
import { z } from "zod";

import {
  getWikiResourceTypeFromSlug,
  type WikiResourceType,
} from "./wikiRouting";

const draftWikiApiResponseSchema = z.union([
  schemas.AgencyDraftWikiDetail,
  schemas.DraftWikiDetail,
  schemas.SongDraftWikiDetail,
  schemas.TalentDraftWikiDetail,
]);

type DraftWikiApiClient = ReturnType<typeof createApiClient>;
type DraftWikiApiResponse = z.infer<typeof draftWikiApiResponseSchema>;
type EditWikiRequestBody = z.infer<typeof schemas.UpdateWikiDraftRequestBody>;
type DraftWikiSummary = z.infer<typeof schemas.DraftWikiSummary>;

type DraftWikiState =
  | { status: "success"; data: WikiDetail }
  | { status: "empty" }
  | { status: "error"; message: string };

const draftWikiAliasByResourceType = {
  agency: "WikiOperations_getAgencyDraftWiki",
  group: "WikiOperations_getGroupDraftWiki",
  song: "WikiOperations_getSongDraftWiki",
  talent: "WikiOperations_getTalentDraftWiki",
} as const;

const trimTrailingSlashes = (value: string): string => {
  let trimmedValue = value;

  while (trimmedValue.endsWith("/")) {
    trimmedValue = trimmedValue.slice(0, -1);
  }

  return trimmedValue;
};

const withWikiApiPrefix = (baseUrl: string): string =>
  baseUrl.endsWith("/api/wiki")
    ? baseUrl
    : `${trimTrailingSlashes(baseUrl)}/api/wiki`;

const defaultApiBaseUrl = process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;

const createPlaceholderHeroImage = (
  name: string,
  resourceType: WikiResourceType,
  imageIdentifier?: string | null,
): WikiDetail["heroImage"] => ({
  alt: `${name} hero image`,
  src:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
        <defs>
          <linearGradient id="wiki-gradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stop-color="#16253f" />
            <stop offset="100%" stop-color="#3560a3" />
          </linearGradient>
        </defs>
        <rect width="1200" height="900" fill="url(#wiki-gradient)" />
        <text x="64" y="120" fill="#ffffff" font-family="Arial, sans-serif" font-size="42">
          ${resourceType.toUpperCase()}
        </text>
        <text x="64" y="184" fill="#ffffff" font-family="Arial, sans-serif" font-size="60">
          ${name}
        </text>
        <text x="64" y="248" fill="#cfd8e6" font-family="Arial, sans-serif" font-size="28">
          ${imageIdentifier ?? "draft-hero-image"}
        </text>
      </svg>
    `),
});

const toStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const toNullableString = (value: unknown): string | null | undefined =>
  typeof value === "string" ? value : value === null ? null : undefined;

const inferResourceType = (response: DraftWikiApiResponse): WikiResourceType => {
  const fromSlug = getWikiResourceTypeFromSlug(response.slug);

  if (fromSlug) {
    return fromSlug;
  }

  if (
    response.resourceType === "agency" ||
    response.resourceType === "group" ||
    response.resourceType === "song" ||
    response.resourceType === "talent"
  ) {
    return response.resourceType;
  }

  return "group";
};

const adaptDraftWikiBasic = (response: DraftWikiApiResponse): WikiBasic => {
  const basic = response.basic as Record<string, unknown>;
  const resourceType = inferResourceType(response);

  return {
    name: String(basic.name ?? response.slug),
    normalizedName: String(basic.normalizedName ?? basic.name ?? response.slug),
    resourceType,
    agencyName: toNullableString(basic.agencyName),
    albumName: toOptionalString(basic.albumName),
    arranger: toOptionalString(basic.arranger),
    birthday: toOptionalString(basic.birthday),
    bloodType: toOptionalString(basic.bloodType),
    ceo: toOptionalString(basic.ceo),
    composer: toOptionalString(basic.composer),
    debutDate: toOptionalString(basic.debutDate),
    emoji: toOptionalString(basic.emoji),
    englishLevel: toOptionalString(basic.englishLevel),
    fandomName: toOptionalString(basic.fandomName),
    generation: toOptionalString(basic.generation),
    genres: toStringArray(basic.genres),
    groupType: toOptionalString(basic.groupType),
    height: typeof basic.height === "number" ? basic.height : undefined,
    lyricist: toOptionalString(basic.lyricist),
    mbti: toOptionalString(basic.mbti),
    officialColors: toStringArray(basic.officialColors),
    officialWebsite: toOptionalString(basic.officialWebsite),
    position: toOptionalString(basic.position),
    realName: toOptionalString(basic.realName),
    releaseDate: toOptionalString(basic.releaseDate),
    representativeSymbol: toOptionalString(basic.representativeSymbol),
    socialLinks: toStringArray(basic.socialLinks),
    songType: toOptionalString(basic.songType),
    status: toOptionalString(basic.status),
    zodiacSign: toOptionalString(basic.zodiacSign),
  };
};

const toSectionIdentifier = (value: unknown, index: number): string =>
  typeof value === "string" && value.length > 0 ? value : `section-${index + 1}`;

const toSectionTitle = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const adaptDraftWikiSections = (sections: unknown[]): WikiDetail["sections"] =>
  sections.map((section, index) => {
    const sectionRecord =
      typeof section === "object" && section !== null
        ? (section as Record<string, unknown>)
        : {};
    const sectionIdentifier = toSectionIdentifier(sectionRecord.id, index);
    const content =
      typeof sectionRecord.content === "string" ? sectionRecord.content : "";

    return {
      type: "section",
      sectionIdentifier,
      title: toSectionTitle(sectionRecord.title, sectionIdentifier),
      displayOrder: index + 1,
      depth: 1,
      contents: content
        ? [
            {
              blockIdentifier: `${sectionIdentifier}-text-1`,
              blockType: "text",
              displayOrder: 1,
              content,
            },
          ]
        : [],
      children: [],
    };
  });

export const adaptDraftWikiResponse = (response: DraftWikiApiResponse): WikiDetail =>
  wikiDetailSchema.parse({
    basic: adaptDraftWikiBasic(response),
    heroImage: createPlaceholderHeroImage(
      String((response.basic as Record<string, unknown>).name ?? response.slug),
      inferResourceType(response),
      response.heroImage.imageIdentifier,
    ),
    language: response.language,
    resourceType: inferResourceType(response),
    sections: adaptDraftWikiSections(response.sections),
    slug: response.slug,
    themeColor: response.themeColor ?? null,
    version: response.version,
    wikiIdentifier: response.wikiIdentifier,
  });

export const getDraftWikiAlias = (
  slug: string,
): (typeof draftWikiAliasByResourceType)[WikiResourceType] | null => {
  const resourceType = getWikiResourceTypeFromSlug(slug);

  return resourceType ? draftWikiAliasByResourceType[resourceType] : null;
};

export const fetchDraftWiki = async (
  client: DraftWikiApiClient,
  language: string,
  slug: string,
): Promise<WikiDetail | null> => {
  const alias = getDraftWikiAlias(slug);

  if (!alias) {
    return null;
  }

  const response = await client[alias]({
    params: {
      language,
      slug,
    },
  });

  return adaptDraftWikiResponse(draftWikiApiResponseSchema.parse(response));
};

export const saveDraftWiki = async (
  client: DraftWikiApiClient,
  wikiId: string,
  body: EditWikiRequestBody,
): Promise<DraftWikiSummary> =>
  schemas.DraftWikiSummary.parse(
    await client.WikiOperations_editWiki(body, {
      params: {
        wikiId,
      },
    }),
  );

export const createDraftWikiApiClient = (
  baseUrl: string = defaultApiBaseUrl ?? "",
): DraftWikiApiClient | null =>
  baseUrl ? createApiClient(withWikiApiPrefix(baseUrl)) : null;

const hasMessage = (value: unknown): value is { message: string } =>
  typeof value === "object" &&
  value !== null &&
  "message" in value &&
  typeof (value as { message: unknown }).message === "string";

export const getDraftWikiErrorMessage = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: unknown }).response !== null
  ) {
    const response = (error as {
      response: {
        status?: number;
        data?: unknown;
      };
    }).response;
    const detail =
      hasMessage(response.data) ? response.data.message : null;

    if (response.status === 404) {
      return detail ?? "Draft wiki was not found.";
    }

    if (response.status) {
      return detail ?? `Draft wiki request failed with status ${response.status}.`;
    }
  }

  if (error instanceof z.ZodError) {
    return `Draft wiki response did not match the expected schema: ${error.issues[0]?.message ?? "invalid response"}`;
  }

  if (hasMessage(error)) {
    return error.message;
  }

  return "Wiki drafts are temporarily unavailable. Please try again later.";
};

export const loadDraftWikiState = async (
  language: string,
  slug: string,
): Promise<DraftWikiState> => {
  const client = createDraftWikiApiClient();

  if (!client) {
    return {
      status: "error",
      message: "Wiki draft API is not configured.",
    };
  }

  try {
    const wiki = await fetchDraftWiki(client, language, slug);

    return wiki ? { status: "success", data: wiki } : { status: "empty" };
  } catch (error) {
    return {
      status: "error",
      message: getDraftWikiErrorMessage(error),
    };
  }
};
