import type {
  WikiBlock,
  WikiBlockType,
  WikiDetail,
  WikiSection,
  WikiSectionContent,
} from "./types/wiki";

export const WIKI_SECTION_MAX_DEPTH = 3;

export type WikiContentEditorId = `section:${string}` | `block:${string}`;

export type WikiSectionContentPayload =
  | {
      type: "section";
      title: string;
      display_order: number;
      contents: WikiSectionContentPayload[];
    }
  | {
      block_type: WikiBlockType;
      display_order: number;
      content?: string;
      image_identifier?: string;
      image_identifiers?: string[];
      caption?: string | null;
      alt?: string | null;
      provider?: string;
      embed_id?: string;
      source?: string | null;
      list_type?: string;
      items?: string[];
      rows?: string[][];
      headers?: string[] | null;
      wiki_identifiers?: string[];
      title?: string | null;
    };

export type WikiEditPayload = {
  wiki_identifier: string;
  slug: string;
  language: string;
  version: number;
  theme_color?: string | null;
  hero_image: {
    src: string;
    alt: string;
  };
  basic: WikiDetail["basic"];
  contents: WikiSectionContentPayload[];
};

const getNextDisplayOrder = (contents: WikiSectionContent[]): number =>
  contents.reduce((max, content) => Math.max(max, content.displayOrder), 0) + 10;

const createIdentifier = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const isWikiSection = (
  content: WikiSectionContent,
): content is WikiSection => "sectionIdentifier" in content;

export const isWikiBlock = (content: WikiSectionContent): content is WikiBlock =>
  "blockIdentifier" in content;

export const getWikiContentEditorId = (
  content: WikiSectionContent,
): WikiContentEditorId =>
  isWikiSection(content)
    ? `section:${content.sectionIdentifier}`
    : `block:${content.blockIdentifier}`;

export const normalizeWikiSectionContents = (
  section: WikiSection,
): WikiSection => {
  const childSections = section.children.map(normalizeWikiSectionContents);
  const existingContents = section.contents.length > 0 ? section.contents : [];
  const childIds = new Set(childSections.map((child) => child.sectionIdentifier));
  const retainedContents = existingContents.filter(
    (content) =>
      !isWikiSection(content) || !childIds.has(content.sectionIdentifier),
  );

  return {
    ...section,
    type: "section",
    contents: sortWikiSectionContents([
      ...retainedContents,
      ...childSections,
    ]),
    children: childSections,
  };
};

export const normalizeWikiSectionsForEditing = (
  sections: WikiSection[],
): WikiSection[] =>
  sortWikiSectionContents(sections.map(normalizeWikiSectionContents)).filter(
    isWikiSection,
  );

export const sortWikiSectionContents = <T extends WikiSectionContent>(
  contents: T[],
): T[] =>
  [...contents]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((content) =>
      isWikiSection(content)
        ? ({
            ...content,
            contents: sortWikiSectionContents(content.contents),
            children: sortWikiSectionContents(content.children),
          } as T)
        : content,
    );

export const createWikiBlock = (
  blockType: WikiBlockType,
  displayOrder: number,
): WikiBlock => {
  const blockIdentifier = createIdentifier(`block-${blockType.replace("_", "-")}`);

  switch (blockType) {
    case "text":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        content: "",
      };
    case "image":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        imageIdentifier: "pending-image",
        imageSrc:
          "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 480'%3E%3Crect width='800' height='480' fill='%23d7e3f4'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='32' fill='%23314a68'%3EImage block%3C/text%3E%3C/svg%3E",
        caption: "New image caption",
        alt: "Editable image block",
      };
    case "image_gallery":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        images: [
          {
            imageIdentifier: "pending-gallery-image",
            imageSrc:
              "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23f4dfc7'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='26' fill='%235b4a34'%3EGallery image%3C/text%3E%3C/svg%3E",
            alt: "Editable gallery image",
          },
        ],
        caption: "New gallery caption",
      };
    case "embed":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        provider: "youtube",
        embedId: "new-embed-id",
        caption: "New embed caption",
      };
    case "quote":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        content: "New quote",
        source: null,
      };
    case "list":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        listType: "bullet",
        items: ["New item"],
      };
    case "table":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        headers: ["Column 1", "Column 2"],
        rows: [["Value 1", "Value 2"]],
      };
    case "profile_card_list":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        wikiIdentifiers: ["aurora-echo"],
        title: "Related profiles",
      };
  }
};

const mapSections = (
  sections: WikiSection[],
  mapper: (section: WikiSection) => WikiSection,
): WikiSection[] =>
  sections.map((section) => {
    const mappedChildren = section.children.length
      ? mapSections(section.children, mapper)
      : section.children;
    const mappedContents = section.contents.map((content) =>
      isWikiSection(content)
        ? mapSections([content], mapper)[0] ?? content
        : content,
    );

    return mapper({
      ...section,
      children: mappedChildren,
      contents: mappedContents,
    });
  });

export const addWikiSection = (
  sections: WikiSection[],
  parentSectionIdentifier?: string,
): [WikiSection[], WikiContentEditorId | null] => {
  let nextEditorId: WikiContentEditorId | null = null;
  const createSection = (parentDepth: number, displayOrder: number): WikiSection => {
    const sectionIdentifier = createIdentifier("section");
    nextEditorId = `section:${sectionIdentifier}`;

    return {
      type: "section",
      sectionIdentifier,
      title: "New section",
      displayOrder,
      depth: parentDepth + 1,
      contents: [],
      children: [],
    };
  };

  if (!parentSectionIdentifier) {
    const section = createSection(0, getNextDisplayOrder(sections));

    return [[...sections, section], nextEditorId];
  }

  const updated = mapSections(sections, (section) => {
    if (section.sectionIdentifier !== parentSectionIdentifier) {
      return section;
    }

    if (section.depth >= WIKI_SECTION_MAX_DEPTH) {
      return section;
    }

    const child = createSection(section.depth, getNextDisplayOrder(section.contents));

    return {
      ...section,
      contents: [...section.contents, child],
      children: [...section.children, child],
    };
  });

  return [updated, nextEditorId];
};

export const addWikiBlock = (
  sections: WikiSection[],
  sectionIdentifier: string,
  blockType: WikiBlockType,
): [WikiSection[], WikiContentEditorId | null] => {
  let nextEditorId: WikiContentEditorId | null = null;
  const updated = mapSections(sections, (section) => {
    if (section.sectionIdentifier !== sectionIdentifier) {
      return section;
    }

    const block = createWikiBlock(blockType, getNextDisplayOrder(section.contents));
    nextEditorId = `block:${block.blockIdentifier}`;

    return {
      ...section,
      contents: [...section.contents, block],
    };
  });

  return [updated, nextEditorId];
};

export const updateWikiSection = (
  sections: WikiSection[],
  sectionIdentifier: string,
  changes: Partial<Pick<WikiSection, "title">>,
): WikiSection[] =>
  mapSections(sections, (section) =>
    section.sectionIdentifier === sectionIdentifier
      ? { ...section, ...changes }
      : section,
  );

export const updateWikiBlock = (
  sections: WikiSection[],
  blockIdentifier: string,
  changes: Partial<WikiBlock>,
): WikiSection[] =>
  mapSections(sections, (section) => ({
    ...section,
    contents: section.contents.map((content) =>
      isWikiBlock(content) && content.blockIdentifier === blockIdentifier
        ? ({ ...content, ...changes } as WikiBlock)
        : content,
    ),
  }));

export const deleteWikiContent = (
  sections: WikiSection[],
  identifier: string,
): WikiSection[] =>
  sections
    .filter((section) => section.sectionIdentifier !== identifier)
    .map((section) => ({
      ...section,
      children: deleteWikiContent(section.children, identifier),
      contents: section.contents
        .filter((content) =>
          isWikiSection(content)
            ? content.sectionIdentifier !== identifier
            : content.blockIdentifier !== identifier,
        )
        .map((content) =>
          isWikiSection(content)
            ? deleteWikiContent([content], identifier)[0] ?? content
            : content,
        ),
    }));

export const toWikiSectionContentPayload = (
  sections: WikiSection[],
): WikiSectionContentPayload[] =>
  sortWikiSectionContents(sections).map((section) =>
    toWikiContentPayload(normalizeWikiSectionContents(section)),
  );

export const toWikiEditPayload = (wiki: WikiDetail): WikiEditPayload => ({
  wiki_identifier: wiki.wikiIdentifier,
  slug: wiki.slug,
  language: wiki.language,
  version: wiki.version,
  theme_color: wiki.themeColor ?? null,
  hero_image: wiki.heroImage,
  basic: wiki.basic,
  contents: toWikiSectionContentPayload(wiki.sections),
});

const toWikiContentPayload = (
  content: WikiSectionContent,
): WikiSectionContentPayload => {
  if (isWikiSection(content)) {
    return {
      type: "section",
      title: content.title,
      display_order: content.displayOrder,
      contents: sortWikiSectionContents(content.contents).map(toWikiContentPayload),
    };
  }

  switch (content.blockType) {
    case "text":
      return {
        block_type: content.blockType,
        display_order: content.displayOrder,
        content: content.content,
      };
    case "image":
      return {
        block_type: content.blockType,
        display_order: content.displayOrder,
        image_identifier: content.imageIdentifier,
        caption: content.caption,
        alt: content.alt,
      };
    case "image_gallery":
      return {
        block_type: content.blockType,
        display_order: content.displayOrder,
        image_identifiers: content.images.map((image) => image.imageIdentifier),
        caption: content.caption,
      };
    case "embed":
      return {
        block_type: content.blockType,
        display_order: content.displayOrder,
        provider: content.provider,
        embed_id: content.embedId,
        caption: content.caption,
      };
    case "quote":
      return {
        block_type: content.blockType,
        display_order: content.displayOrder,
        content: content.content,
        source: content.source,
      };
    case "list":
      return {
        block_type: content.blockType,
        display_order: content.displayOrder,
        list_type: content.listType,
        items: content.items,
      };
    case "table":
      return {
        block_type: content.blockType,
        display_order: content.displayOrder,
        rows: content.rows,
        headers: content.headers,
      };
    case "profile_card_list":
      return {
        block_type: content.blockType,
        display_order: content.displayOrder,
        wiki_identifiers: content.wikiIdentifiers,
        title: content.title,
      };
  }
};
