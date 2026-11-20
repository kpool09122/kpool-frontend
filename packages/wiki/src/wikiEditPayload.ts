import type {
  WikiBlockType,
  WikiDraftDetail,
  WikiHistoryEntry,
  WikiProfileCardListBlock,
  WikiSection,
  WikiSectionContent,
} from "./types/wiki";
import { normalizeWikiImageWidth } from "./wikiImageLayout";
import {
  isWikiSection,
  normalizeWikiSectionContents,
  sortWikiSectionContents,
} from "./wikiSectionModel";

export type WikiSectionContentPayload =
  | {
      type: "section";
      sectionKey: string;
      title: string;
      displayOrder: number;
      contents: WikiSectionContentPayload[];
    }
  | {
      type: WikiBlockType;
      blockKey: string;
      displayOrder: number;
      content?: string;
      imageIdentifier?: string;
      imageIdentifiers?: string[];
      imageWidth?: number | null;
      caption?: string | null;
      alt?: string | null;
      provider?: string;
      embedId?: string;
      source?: string | null;
      listType?: string;
      items?: string[];
      entries?: WikiHistoryEntry[];
      rows?: string[][];
      headers?: string[] | null;
      rowCells?: Array<Array<{ content: string; colspan?: number }>>;
      headerCells?: Array<{ content: string; colspan?: number }> | null;
      tableWidth?: number | null;
      relatedResourceType?: WikiDraftDetail["resourceType"] | null;
      cardShape?: WikiProfileCardListBlock["cardShape"];
      profiles?: WikiProfileCardListBlock["profiles"];
      wikiIdentifiers?: string[];
      title?: string | null;
    };

export type WikiEditPayload = {
  wiki_identifier: string;
  slug: string;
  language: string;
  theme_color?: string | null;
  font_style?: string | null;
  title: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  hero_image: {
    src: string;
    alt: string;
  };
  basic: WikiDraftDetail["basic"];
  contents: WikiSectionContentPayload[];
};

export type WikiEditRequestPayload = {
  resourceType: WikiDraftDetail["resourceType"];
  basic: WikiDraftDetail["basic"];
  sections: WikiSectionContentPayload[];
  themeColor: string | null;
  fontStyle: string | null;
  title: string | null;
  metaDescription: string | null;
  keywords: string[] | null;
  imageIdentifier?: string | null;
};

export const normalizeSeoText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
};

export const normalizeSeoKeywords = (
  value: string[] | null | undefined,
): string[] | null => {
  const keywords = value?.map((keyword) => keyword.trim()).filter(Boolean) ?? [];

  return keywords.length > 0 ? keywords : null;
};

export const toWikiSectionContentPayload = (
  sections: WikiSection[],
  keyNamespace?: string,
): WikiSectionContentPayload[] =>
  sortWikiSectionContents(sections).map((section) =>
    toWikiContentPayload(normalizeWikiSectionContents(section), keyNamespace),
  );

export const toWikiEditPayload = (wiki: WikiDraftDetail): WikiEditPayload => ({
  wiki_identifier: wiki.wikiIdentifier,
  slug: wiki.slug,
  language: wiki.language,
  theme_color: wiki.themeColor ?? null,
  font_style: wiki.fontStyle ?? null,
  title: normalizeSeoText(wiki.title),
  meta_description: normalizeSeoText(wiki.metaDescription),
  keywords: normalizeSeoKeywords(wiki.keywords),
  hero_image: wiki.heroImage,
  basic: wiki.basic,
  contents: toWikiSectionContentPayload(wiki.sections, wiki.wikiIdentifier),
});

export const toWikiEditRequestPayload = (wiki: WikiDraftDetail): WikiEditRequestPayload => ({
  resourceType: wiki.resourceType,
  basic: wiki.basic,
  sections: toWikiSectionContentPayload(wiki.sections, wiki.wikiIdentifier),
  themeColor: wiki.themeColor ?? null,
  fontStyle: wiki.fontStyle ?? null,
  title: normalizeSeoText(wiki.title),
  metaDescription: normalizeSeoText(wiki.metaDescription),
  keywords: normalizeSeoKeywords(wiki.keywords),
  imageIdentifier: wiki.heroImage.imageIdentifier ?? null,
});

// Legacy position-based editor keys are scoped to the originating Wiki on first save.
// Independently edited translations must not acquire matching keys merely by position.
const persistentKey = (key: string, namespace?: string): string =>
  namespace && /^section-\d+(?:-\d+)*(?:-(?:block|text)-\d+)?$/.test(key)
    ? `${namespace}:${key}`
    : key;

const toWikiContentPayload = (
  content: WikiSectionContent,
  keyNamespace?: string,
): WikiSectionContentPayload => {
  if (isWikiSection(content)) {
    return {
      type: "section",
      sectionKey: persistentKey(content.sectionKey, keyNamespace),
      title: content.title,
      displayOrder: content.displayOrder,
      contents: sortWikiSectionContents(content.contents).map((child) => toWikiContentPayload(child, keyNamespace)),
    };
  }

  switch (content.blockType) {
    case "text":
      return {
        type: content.blockType,
        blockKey: persistentKey(content.blockKey, keyNamespace),
        displayOrder: content.displayOrder,
        content: content.content,
      };
    case "image":
      return {
        type: content.blockType,
        blockKey: persistentKey(content.blockKey, keyNamespace),
        displayOrder: content.displayOrder,
        imageIdentifier: content.imageIdentifier,
        ...(content.imageWidth == null ? {} : { imageWidth: normalizeWikiImageWidth(content.imageWidth) }),
        caption: content.caption,
        alt: content.alt,
      };
    case "image_gallery":
      return {
        type: content.blockType,
        blockKey: persistentKey(content.blockKey, keyNamespace),
        displayOrder: content.displayOrder,
        imageIdentifiers: content.images.map((image) => image.imageIdentifier),
        ...(content.imageWidth == null ? {} : { imageWidth: normalizeWikiImageWidth(content.imageWidth) }),
        caption: content.caption,
      };
    case "embed":
      return {
        type: content.blockType,
        blockKey: persistentKey(content.blockKey, keyNamespace),
        displayOrder: content.displayOrder,
        provider: content.provider,
        embedId: content.embedId,
        caption: content.caption,
      };
    case "quote":
      return {
        type: content.blockType,
        blockKey: persistentKey(content.blockKey, keyNamespace),
        displayOrder: content.displayOrder,
        content: content.content,
        source: content.source,
      };
    case "list":
      return {
        type: content.blockType,
        blockKey: persistentKey(content.blockKey, keyNamespace),
        displayOrder: content.displayOrder,
        listType: content.listType,
        items: content.items,
      };
    case "history":
      return {
        type: content.blockType,
        blockKey: persistentKey(content.blockKey, keyNamespace),
        displayOrder: content.displayOrder,
        entries: content.entries,
      };
    case "table":
      return {
        type: content.blockType,
        blockKey: persistentKey(content.blockKey, keyNamespace),
        displayOrder: content.displayOrder,
        rows: content.rows,
        headers: content.headers,
        rowCells: content.rowCells,
        headerCells: content.headerCells ?? null,
        tableWidth: content.tableWidth ?? null,
      };
    case "profile_card_list":
      return {
        type: content.blockType,
        blockKey: persistentKey(content.blockKey, keyNamespace),
        displayOrder: content.displayOrder,
        ...(content.cardShape ? { cardShape: content.cardShape } : {}),
        relatedResourceType: content.relatedResourceType ?? null,
        profiles: content.profiles ?? [],
        wikiIdentifiers: content.wikiIdentifiers,
        title: content.title,
      };
  }
};
