import type { WikiBlock, WikiBlockType, WikiSection, WikiSectionContent } from "./types/wiki";
import { newWikiEmbedId } from "./wikiEmbedModel";

export const WIKI_SECTION_MAX_DEPTH = 3;

export type WikiContentEditorId = `section:${string}` | `block:${string}`;

export const DISPLAY_ORDER_STEP = 10;

export const getNextDisplayOrder = (contents: WikiSectionContent[]): number =>
  contents.reduce((max, content) => Math.max(max, content.displayOrder), 0) +
  DISPLAY_ORDER_STEP;

export const createWikiContentIdentifier = (prefix: string): string =>
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
  const normalizedContents = section.contents.map((content) =>
    isWikiSection(content) ? normalizeWikiSectionContents(content) : content,
  );
  return {
    ...section,
    type: "section",
    contents: sortWikiSectionContents(normalizedContents),
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
          } as T)
        : content,
    );

export const createWikiBlock = (
  blockType: WikiBlockType,
  displayOrder: number,
): WikiBlock => {
  const blockIdentifier = createWikiContentIdentifier(`block-${blockType.replace("_", "-")}`);

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
        embedId: newWikiEmbedId,
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
    case "history":
      return { blockIdentifier, blockType, displayOrder, entries: [] };
    case "table":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        headers: ["Column 1", "Column 2"],
        headerCells: [{ content: "Column 1" }, { content: "Column 2" }],
        rows: [["Value 1", "Value 2"]],
        rowCells: [[{ content: "Value 1" }, { content: "Value 2" }]],
        tableWidth: null,
      };
    case "profile_card_list":
      return {
        blockIdentifier,
        blockType,
        displayOrder,
        relatedResourceType: null,
        profiles: [],
        wikiIdentifiers: [],
        title: "Related profiles",
      };
  }
};

const mapSections = (
  sections: WikiSection[],
  mapper: (section: WikiSection) => WikiSection,
): WikiSection[] =>
  sections.map((section) => {
    const normalizedSection = normalizeWikiSectionContents(section);
    const mappedContents = normalizedSection.contents.map((content) =>
      isWikiSection(content)
        ? mapSections([content], mapper)[0] ?? content
        : content,
    );

    return mapper({
      ...normalizedSection,
      contents: mappedContents,
    });
  });

export const addWikiSection = (
  sections: WikiSection[],
  parentSectionIdentifier?: string,
): [WikiSection[], WikiContentEditorId | null] => {
  let nextEditorId: WikiContentEditorId | null = null;
  const createSection = (parentDepth: number, displayOrder: number): WikiSection => {
    const sectionIdentifier = createWikiContentIdentifier("section");
    nextEditorId = `section:${sectionIdentifier}`;

    return {
      type: "section",
      sectionIdentifier,
      title: "New section",
      displayOrder,
      depth: parentDepth + 1,
      contents: [],
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

export type WikiContentMove = {
  parentSectionIdentifier?: string;
  source: WikiContentEditorId;
  target: WikiContentEditorId;
};

export const reorderWikiContent = (
  sections: WikiSection[],
  { parentSectionIdentifier, source, target }: WikiContentMove,
): WikiSection[] => {
  if (source === target) return sections;
  const movingSection = source.startsWith("section:");
  const isMovable = (content: WikiSectionContent) => isWikiSection(content) === movingSection;

  const reorderSiblings = <T extends WikiSectionContent>(siblings: T[]): T[] => {
    const ordered = [...siblings].sort((left, right) => left.displayOrder - right.displayOrder);
    const movable = ordered.filter(isMovable);
    const sourceIndex = movable.findIndex((content) => getWikiContentEditorId(content) === source);
    const targetIndex = movable.findIndex((content) => getWikiContentEditorId(content) === target);
    if (sourceIndex < 0 || targetIndex < 0) return siblings;

    const [moved] = movable.splice(sourceIndex, 1);
    movable.splice(targetIndex, 0, moved);
    const hasDuplicateOrder = ordered.some((content, index) => content.displayOrder === ordered[index - 1]?.displayOrder);
    let nextIndex = 0;
    return ordered.map((content, index) => {
      const reordered = isMovable(content) ? movable[nextIndex++] : content;
      const displayOrder = hasDuplicateOrder ? (index + 1) * DISPLAY_ORDER_STEP : content.displayOrder;
      return reordered.displayOrder === displayOrder ? reordered : { ...reordered, displayOrder };
    });
  };

  if (parentSectionIdentifier === undefined) return reorderSiblings(sections);

  const visit = <T extends WikiSectionContent>(contents: T[]): T[] => {
    const updated = contents.map((content) => {
      if (!isWikiSection(content)) return content;
      const children = content.sectionIdentifier === parentSectionIdentifier
        ? reorderSiblings(content.contents)
        : visit(content.contents);
      return children === content.contents ? content : { ...content, contents: children };
    });
    return updated.some((content, index) => content !== contents[index]) ? updated : contents;
  };

  return visit(sections);
};

export const deleteWikiContent = (
  sections: WikiSection[],
  identifier: string,
): WikiSection[] =>
  sections
    .filter((section) => section.sectionIdentifier !== identifier)
    .map((section) => {
      const normalizedSection = normalizeWikiSectionContents(section);

      return {
        ...normalizedSection,
        contents: normalizedSection.contents
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
      };
    });
