import { type WikiBasic, type WikiDetail, wikiDetailSchema } from "@kpool/wiki";
import { z } from "zod";

import {
  getWikiResourceTypeFromSlug,
  type WikiResourceType,
} from "./wikiRouting";

export const trimTrailingSlashes = (value: string): string => {
  let trimmedValue = value;

  while (trimmedValue.endsWith("/")) {
    trimmedValue = trimmedValue.slice(0, -1);
  }

  return trimmedValue;
};

export const withWikiApiPrefix = (baseUrl: string): string =>
  baseUrl.endsWith("/api/wiki")
    ? baseUrl
    : `${trimTrailingSlashes(baseUrl)}/api/wiki`;

export const toStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;

export const toOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

export const toNullableString = (value: unknown): string | null | undefined =>
  typeof value === "string" ? value : value === null ? null : undefined;

type WikiApiResponse = {
  basic?: unknown;
  heroImage?: {
    imageIdentifier?: string | null;
    src?: string;
    alt?: string | null;
  } | null;
  language: string;
  resourceType?: unknown;
  sections: unknown[];
  slug: string;
  themeColor?: string | null;
  version: number;
  translationSetIdentifier: string;
  wikiIdentifier: string;
};

export const inferResourceType = (response: WikiApiResponse): WikiResourceType => {
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

export const createPlaceholderHeroImage = (
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
          ${imageIdentifier ?? "wiki-hero-image"}
        </text>
      </svg>
    `),
});

const adaptWikiBasic = (response: WikiApiResponse): WikiBasic => {
  const basic =
    typeof response.basic === "object" && response.basic !== null
      ? (response.basic as Record<string, unknown>)
      : {};
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

const adaptWikiSections = (sections: unknown[]): WikiDetail["sections"] =>
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

const getHeroImage = (response: WikiApiResponse): WikiDetail["heroImage"] => {
  const basic =
    typeof response.basic === "object" && response.basic !== null
      ? (response.basic as Record<string, unknown>)
      : {};
  const name = String(basic.name ?? response.slug);

  if (response.heroImage?.src) {
    return {
      alt: response.heroImage.alt ?? `${name} hero image`,
      src: response.heroImage.src,
    };
  }

  return createPlaceholderHeroImage(
    name,
    inferResourceType(response),
    response.heroImage?.imageIdentifier,
  );
};

export const adaptWikiApiResponse = (response: WikiApiResponse): WikiDetail =>
  wikiDetailSchema.parse({
    basic: adaptWikiBasic(response),
    heroImage: getHeroImage(response),
    language: response.language,
    resourceType: inferResourceType(response),
    sections: adaptWikiSections(response.sections),
    slug: response.slug,
    themeColor: response.themeColor ?? null,
    translationSetIdentifier: response.translationSetIdentifier,
    version: response.version,
    wikiIdentifier: response.wikiIdentifier,
  });

export const getWikiApiErrorMessage = (
  error: unknown,
  messages: {
    notFound: string;
    responseSchemaPrefix: string;
    unavailable: string;
    requestFailedPrefix: string;
  },
): string => {
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
      typeof response.data === "object" &&
      response.data !== null &&
      "message" in response.data &&
      typeof (response.data as { message: unknown }).message === "string"
        ? (response.data as { message: string }).message
        : null;

    if (response.status === 404) {
      return detail ?? messages.notFound;
    }

    if (response.status) {
      return detail ?? `${messages.requestFailedPrefix} ${response.status}.`;
    }
  }

  if (error instanceof z.ZodError) {
    return `${messages.responseSchemaPrefix}: ${error.issues[0]?.message ?? "invalid response"}`;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return messages.unavailable;
};
