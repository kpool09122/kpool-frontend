import {
  type WikiBasic,
  type WikiBlock,
  type WikiBlockType,
  type WikiDetail,
  type WikiEmbedProvider,
  type WikiSectionContent,
  wikiDetailSchema,
  type WikiResourceType,
} from "./types/wiki";
import { z } from "zod";

import { getWikiResourceTypeFromSlug } from "./wikiRouting";

const parseWikiSchema = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const result = schema.safeParse(body);

  return result.success ? result.data : (body as T);
};

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
    src?: string | null;
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
  imageIdentifier: imageIdentifier ?? null,
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

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const toString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const toNullable = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const toNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" ? value : fallback;

const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const toEmbedProvider = (value: unknown): WikiEmbedProvider => {
  const provider = toString(value);

  return ["youtube", "spotify", "x", "tiktok"].includes(provider)
    ? (provider as WikiEmbedProvider)
    : "youtube";
};

const toTableCells = (
  value: unknown,
): Array<Array<{ content: string; colspan?: number }>> | undefined =>
  Array.isArray(value)
    ? value.map((row) =>
        Array.isArray(row)
          ? row.map((cell) => {
              const record = toRecord(cell);
              const colspan = toNumber(record.colspan, 0);

              return {
                content: toString(record.content),
                ...(colspan > 1 ? { colspan } : {}),
              };
            })
          : [],
      )
    : undefined;

const toHeaderCells = (value: unknown): Array<{ content: string; colspan?: number }> | null =>
  Array.isArray(value)
    ? value.map((cell) => {
        const record = toRecord(cell);
        const colspan = toNumber(record.colspan, 0);

        return {
          content: toString(record.content),
          ...(colspan > 1 ? { colspan } : {}),
        };
      })
    : null;

const imagePlaceholderSrc = (imageIdentifier: string): string =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480">
      <rect width="800" height="480" fill="#d7e3f4" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="28" fill="#314a68">
        ${imageIdentifier}
      </text>
    </svg>
  `);

const getBlockType = (content: Record<string, unknown>): WikiBlockType | null => {
  const rawType = toString(content.blockType || content.block_type || content.type);

  return [
    "text",
    "image",
    "image_gallery",
    "embed",
    "quote",
    "list",
    "table",
    "profile_card_list",
  ].includes(rawType)
    ? (rawType as WikiBlockType)
    : null;
};

const adaptWikiBlock = (
  content: Record<string, unknown>,
  index: number,
  path: string,
): WikiBlock | null => {
  const blockType = getBlockType(content);
  const displayOrder = toNumber(content.displayOrder ?? content.display_order, index + 1);
  const blockIdentifier = toString(content.id ?? content.blockIdentifier, `${path}-block-${index + 1}`);

  switch (blockType) {
    case "text":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        content: toString(content.content),
      };
    case "image": {
      const imageIdentifier = toString(content.imageIdentifier ?? content.image_identifier);

      return {
        blockIdentifier,
        blockType,
        displayOrder,
        imageIdentifier,
        imageSrc: toString(content.imageSrc ?? content.src, imagePlaceholderSrc(imageIdentifier)),
        caption: toNullable(content.caption),
        alt: toNullable(content.alt),
      };
    }
    case "image_gallery": {
      const images = Array.isArray(content.images)
        ? content.images.map((image) => {
            const imageRecord = toRecord(image);
            const imageIdentifier = toString(imageRecord.imageIdentifier ?? imageRecord.image_identifier);

            return {
              imageIdentifier,
              imageSrc: toString(
                imageRecord.imageSrc ?? imageRecord.src ?? imageRecord.imageUrl ?? imageRecord.image_url,
                imagePlaceholderSrc(imageIdentifier),
              ),
              alt: toNullable(imageRecord.alt),
            };
          })
        : toStringList(content.imageIdentifiers ?? content.image_identifiers).map((imageIdentifier) => ({
            imageIdentifier,
            imageSrc: imagePlaceholderSrc(imageIdentifier),
            alt: imageIdentifier,
          }));

      return {
        blockIdentifier,
        blockType,
        displayOrder,
        images,
        caption: toNullable(content.caption),
      };
    }
    case "embed":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        provider: toEmbedProvider(content.provider),
        embedId: toString(content.embedId ?? content.embed_id),
        caption: toNullable(content.caption),
      };
    case "quote":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        content: toString(content.content),
        source: toNullable(content.source),
      };
    case "list":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        listType: toString(content.listType ?? content.list_type, "bullet") === "numbered" ? "numbered" : "bullet",
        items: toStringList(content.items),
      };
    case "table": {
      const rowCells = toTableCells(content.rowCells ?? content.row_cells);
      const headerCells = toHeaderCells(content.headerCells ?? content.header_cells);

      return {
        blockIdentifier,
        blockType,
        displayOrder,
        headers: Array.isArray(content.headers) ? toStringList(content.headers) : headerCells?.map((cell) => cell.content) ?? null,
        rows: Array.isArray(content.rows)
          ? content.rows.map((row) => (Array.isArray(row) ? toStringList(row) : []))
          : rowCells?.map((row) => row.map((cell) => cell.content)) ?? [],
        headerCells,
        rowCells,
        tableWidth: typeof content.tableWidth === "number"
          ? content.tableWidth
          : typeof content.table_width === "number"
            ? content.table_width
            : null,
      };
    }
    case "profile_card_list":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        wikiIdentifiers: toStringList(content.wikiIdentifiers ?? content.wiki_identifiers),
        title: toNullable(content.title),
      };
    default:
      return null;
  }
};

const adaptWikiSectionContents = (
  contents: unknown[],
  depth: number,
  path: string,
): WikiSectionContent[] =>
  contents.flatMap((content, index): WikiSectionContent[] => {
    const record = toRecord(content);

    if (record.type === "section") {
      return [adaptWikiSection(record, index, depth, `${path}-${index + 1}`)];
    }

    const block = adaptWikiBlock(record, index, path);

    return block ? [block] : [];
  });

const adaptWikiSection = (
  section: Record<string, unknown>,
  index: number,
  depth: number,
  path: string,
): WikiDetail["sections"][number] => {
  const sectionIdentifier = toSectionIdentifier(
    section.id ?? section.sectionIdentifier ?? section.section_identifier,
    index,
  );
  const rawContents = Array.isArray(section.contents) ? section.contents : [];
  const content = typeof section.content === "string" ? section.content : "";
  const adaptedContents = content
    ? [
        {
          blockIdentifier: `${sectionIdentifier}-text-1`,
          blockType: "text" as const,
          displayOrder: 1,
          content,
        },
        ...adaptWikiSectionContents(rawContents, depth + 1, path),
      ]
    : adaptWikiSectionContents(rawContents, depth + 1, path);
  const children = adaptedContents.filter(
    (content): content is WikiDetail["sections"][number] => "sectionIdentifier" in content,
  );

  return {
    type: "section",
    sectionIdentifier,
    title: toSectionTitle(section.title, sectionIdentifier),
    displayOrder: toNumber(section.displayOrder ?? section.display_order, index + 1),
    depth,
    contents: adaptedContents,
    children,
  };
};

const adaptWikiSections = (sections: unknown[]): WikiDetail["sections"] =>
  sections.map((section, index) => adaptWikiSection(toRecord(section), index, 1, `section-${index + 1}`));

const getHeroImage = (response: WikiApiResponse): WikiDetail["heroImage"] => {
  const basic =
    typeof response.basic === "object" && response.basic !== null
      ? (response.basic as Record<string, unknown>)
      : {};
  const name = String(basic.name ?? response.slug);

  if (response.heroImage?.src) {
    return {
      imageIdentifier: response.heroImage.imageIdentifier ?? null,
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
  parseWikiSchema(wikiDetailSchema, {
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
