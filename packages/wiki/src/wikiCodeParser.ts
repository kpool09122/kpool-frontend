import type {
  WikiBlock,
  WikiBlockType,
  WikiDraftDetail,
  WikiEmbedBlock,
  WikiEmbedProvider,
  WikiHistoryEntry,
  WikiSection,
} from "./types/wiki";
import { wikiHistoryEntrySchema, wikiProfileCardShapeSchema } from "./types/wiki";
import {
  decodeCodeUri,
  parseCodeMacro,
  parseHistoryCodeText,
  splitEscaped,
  unescapeCodeValue,
} from "./wikiCodeSyntax";
import { normalizeWikiImageWidth } from "./wikiImageLayout";
import {
  createWikiContentIdentifier,
  DISPLAY_ORDER_STEP,
  getNextDisplayOrder,
  isWikiSection,
  normalizeWikiSectionsForEditing,
  WIKI_SECTION_MAX_DEPTH,
} from "./wikiSectionModel";

export type WikiCodeErrorCode =
  | "invalidMacro"
  | "imageRequired"
  | "galleryRequired"
  | "galleryImageRequired"
  | "embedRequired"
  | "headingSkipped"
  | "headingTitleRequired"
  | "headingRequired"
  | "headingDepth";

export type WikiCodeWarningCode = "fileLink" | "extendedTable";

export type WikiCodeParseResult =
  | {
      ok: true;
      sections: WikiSection[];
      warnings: WikiCodeWarningCode[];
    }
  | {
      ok: false;
      code: WikiCodeErrorCode;
    };

const headingPattern = /^(=+)\s*(.*?)\s*\1$/;

const getHeadingDepth = (line: string): number | null => {
  const match = line.match(headingPattern);

  if (!match) {
    return null;
  }

  return match[1].length;
};

const getHeadingTitle = (line: string): string | null => {
  const match = line.match(headingPattern);

  return match?.[2]?.trim() ?? null;
};

const parseTableCells = (line: string): string[] =>
  line
    .trim()
    .replace(/^(\|\|)\s*/, "")
    .replace(/\s*(\|\|)$/, "")
    .split("||")
    .map((cell) => cell.trim());

const parseTableCell = (
  rawCell: string,
): {
  cell: { content: string; colspan?: number };
  isHeader: boolean;
  tableWidth: number | null;
  hasUnsupportedAttributes: boolean;
} => {
  let value = rawCell.trim();
  let isHeader = false;
  let tableWidth: number | null = null;
  let colspan: number | undefined;
  let hasUnsupportedAttributes = false;

  if (value.startsWith("!")) {
    isHeader = true;
    value = value.slice(1).trimStart();
  }

  while (value.startsWith("<")) {
    const endIndex = value.indexOf(">");

    if (endIndex < 0) {
      break;
    }

    const attribute = value.slice(1, endIndex).trim();

    if (/^tablewidth=\d+$/i.test(attribute)) {
      tableWidth = Number(attribute.split("=")[1]);
    } else if (/^-\d+$/.test(attribute)) {
      colspan = Number(attribute.slice(1));
    } else {
      hasUnsupportedAttributes = true;
    }

    value = value.slice(endIndex + 1).trimStart();
  }

  if (value.startsWith("!")) {
    isHeader = true;
    value = value.slice(1).trimStart();
  }

  return {
    cell: {
      content: value,
      ...(colspan && colspan > 1 ? { colspan } : {}),
    },
    hasUnsupportedAttributes,
    isHeader,
    tableWidth,
  };
};

const countRenderedColumns = (cells: Array<{ colspan?: number }>): number =>
  cells.reduce((sum, cell) => sum + (cell.colspan ?? 1), 0);

const trimOverflowCells = (
  cells: Array<{ content: string; colspan?: number }>,
  columnCount: number,
): Array<{ content: string; colspan?: number }> => {
  const trimmed = [...cells];

  while (countRenderedColumns(trimmed) > columnCount) {
    const lastCell = trimmed.at(-1);

    if (!lastCell || lastCell.content.trim() || (lastCell.colspan ?? 1) > 1) {
      break;
    }

    trimmed.pop();
  }

  return trimmed;
};

const createParseError = (code: WikiCodeErrorCode): WikiCodeParseResult => ({
  ok: false,
  code,
});

const createParseSuccess = (
  sections: WikiSection[],
  warnings: WikiCodeWarningCode[] = [],
): WikiCodeParseResult => ({
  ok: true,
  sections,
  warnings,
});

const parseNamuIncludeMacro = (
  line: string,
): { name: string; params: Record<string, string> } | null => {
  const trimmedLine = line.trim();

  if (!trimmedLine.startsWith("[include(") || !trimmedLine.endsWith(")]")) {
    return null;
  }

  const rawContent = trimmedLine.slice(9, -2).trim();
  const [rawName, ...rawParts] = splitEscaped(rawContent, ",");
  const name = rawName?.trim();

  if (!name) {
    return null;
  }

  const params = rawParts.reduce<Record<string, string>>((result, part) => {
    const dividerIndex = part.indexOf("=");

    if (dividerIndex < 0) {
      return result;
    }

    const key = part.slice(0, dividerIndex).trim();

    if (!key) {
      return result;
    }

    result[key] = unescapeCodeValue(part.slice(dividerIndex + 1).trim());

    return result;
  }, {});

  return {
    name,
    params,
  };
};

type WikiCodeBlocksParseResult =
  | {
      ok: true;
      blocks: WikiBlock[];
      warnings: WikiCodeWarningCode[];
    }
  | {
      ok: false;
      code: WikiCodeErrorCode;
    };

const createBlockParseError = (code: WikiCodeErrorCode): WikiCodeBlocksParseResult => ({
  ok: false,
  code,
});

const isSupportedCodeMacro = (name: string): boolean =>
  ["image", "gallery", "embed", "profiles", "history"].includes(name);

const parseHistoryCodeEntries = (fields: Record<string, string>): WikiHistoryEntry[] | null => {
  const entries: WikiHistoryEntry[] = [];
  const rows = new Set(Object.keys(fields).map((key) => key.match(/^(?:year|title|detail)([1-9][0-9]*)$/)?.[1]));

  if (rows.has(undefined)) return null;

  for (let row = 1; row <= rows.size; row += 1) {
    const year = fields[`year${row}`]?.trim() ?? "";
    const detail = fields[`detail${row}`];
    const entry = wikiHistoryEntrySchema.safeParse({
      year: /^[1-9][0-9]{3}$/.test(year) ? Number(year) : null,
      title: parseHistoryCodeText(fields[`title${row}`] ?? ""),
      detail: detail === undefined ? null : parseHistoryCodeText(detail),
    });

    if (!entry.success) return null;
    entries.push(entry.data);
  }

  return entries;
};

const isListLine = (line: string): boolean =>
  /^\*\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim());

const isQuoteLine = (line: string): boolean => line.trim().startsWith(">");

const isTableLine = (line: string): boolean => line.trim().startsWith("||");

const isStructuredMacroLine = (line: string): boolean => {
  const macro = parseCodeMacro(line.trim());

  return Boolean(
    macro && (macro.name === "__invalid__" || isSupportedCodeMacro(macro.name)),
  );
};

const isStructuredBlockStart = (line: string): boolean =>
  isStructuredMacroLine(line) ||
  isQuoteLine(line) ||
  isListLine(line) ||
  isTableLine(line);

const detectTextFallbackWarnings = (content: string): WikiCodeWarningCode[] => {
  const warnings = new Set<WikiCodeWarningCode>();

  if (/\[\[(파일|File):[^[\]]+\]\]/.test(content)) {
    warnings.add("fileLink");
  }

  return [...warnings];
};

const hasExtendedTableSyntax = (cells: string[]): boolean =>
  cells.some((cell) =>
    /^<[^>]+>/.test(cell.trim()) &&
    !/^<(tablewidth=\d+|-\d+)>/i.test(cell.trim()),
  );

const includeTemplateToEmbedProvider = (
  name: string,
): WikiEmbedProvider | null => {
  const normalizedName = name.trim().toLowerCase();

  if (["틀:영상 정렬", "틀:youtube", "틀:유튜브"].includes(normalizedName)) {
    return "youtube";
  }

  if (["틀:x", "틀:twitter", "틀:트위터", "틀:tweet", "틀:트윗"].includes(normalizedName)) {
    return "x";
  }

  if (["틀:spotify", "틀:스포티파이"].includes(normalizedName)) {
    return "spotify";
  }

  if (["틀:tiktok", "틀:틱톡"].includes(normalizedName)) {
    return "tiktok";
  }

  return null;
};

const getIncludeEmbedId = (
  provider: WikiEmbedProvider,
  params: Record<string, string>,
): string | null => {
  const candidates = (() => {
    switch (provider) {
      case "youtube":
        return [params.url, params.주소, params.id, params.video];
      case "x":
        return [params.url, params.주소, params.id, params.tweetId, params.vid];
      case "spotify":
        return [params.url, params.주소, params.id];
      case "tiktok":
        return [params.url, params.주소, params.id, params.video];
    }
  })();

  return candidates.find((candidate) => candidate?.trim())?.trim() ?? null;
};

const parseIncludeEmbedBlock = (
  line: string,
): Omit<WikiEmbedBlock, "blockIdentifier" | "displayOrder"> | null => {
  const includeMacro = parseNamuIncludeMacro(line);

  if (!includeMacro) {
    return null;
  }

  const provider = includeTemplateToEmbedProvider(includeMacro.name);

  if (!provider) {
    return null;
  }

  const embedId = getIncludeEmbedId(provider, includeMacro.params);

  if (!embedId) {
    return null;
  }

  return {
    blockType: "embed",
    caption: includeMacro.params.caption?.trim() || includeMacro.params.내용?.trim() || null,
    embedId,
    provider,
  };
};

const parseCodeBlocks = (lines: string[]): WikiCodeBlocksParseResult => {
  const blocks: WikiBlock[] = [];
  const warnings = new Set<WikiCodeWarningCode>();
  let cursor = 0;

  const addBlock = (block: Record<string, unknown> & { blockType: WikiBlockType }) => {
    blocks.push({
      ...block,
      blockIdentifier: createWikiContentIdentifier(`block-${block.blockType.replaceAll("_", "-")}`),
      displayOrder: (blocks.length + 1) * DISPLAY_ORDER_STEP,
    } as WikiBlock);
  };

  while (cursor < lines.length) {
    const line = lines[cursor];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      cursor += 1;
      continue;
    }

    if (isQuoteLine(line)) {
      const quoteLines: string[] = [];

      while (cursor < lines.length && isQuoteLine(lines[cursor])) {
        quoteLines.push(lines[cursor].trim().replace(/^>\s?/, ""));
        cursor += 1;
      }

      const maybeSource = quoteLines.at(-1)?.match(/^--\s+(.+)$/)?.[1] ?? null;
      const contentLines = maybeSource ? quoteLines.slice(0, -1) : quoteLines;

      addBlock({
        blockType: "quote",
        content: contentLines.join("\n"),
        source: maybeSource,
      });
      continue;
    }

    if (isListLine(line)) {
      const isNumbered = /^\d+\.\s+/.test(trimmedLine);
      const items: string[] = [];

      while (
        cursor < lines.length &&
        (isNumbered
          ? /^\d+\.\s+/.test(lines[cursor].trim())
          : /^\*\s+/.test(lines[cursor].trim()))
      ) {
        items.push(
          lines[cursor]
            .trim()
            .replace(isNumbered ? /^\d+\.\s+/ : /^\*\s+/, ""),
        );
        cursor += 1;
      }

      addBlock({
        blockType: "list",
        items,
        listType: isNumbered ? "numbered" : "bullet",
      });
      continue;
    }

    if (isTableLine(line)) {
      const rows: string[][] = [];
      const rowCells: Array<Array<{ content: string; colspan?: number }>> = [];
      let headerCells: Array<{ content: string; colspan?: number }> | null = null;
      let tableWidth: number | null = null;

      while (cursor < lines.length && isTableLine(lines[cursor])) {
        const parsedCells = parseTableCells(lines[cursor]).map(parseTableCell);
        const cells = parsedCells.map(({ cell }) => cell);

        if (
          hasExtendedTableSyntax(parseTableCells(lines[cursor])) ||
          parsedCells.some(({ hasUnsupportedAttributes }) => hasUnsupportedAttributes)
        ) {
          warnings.add(
            "extendedTable",
          );
        }

        tableWidth ??= parsedCells.find(({ tableWidth: width }) => width != null)?.tableWidth ?? null;
        rowCells.push(cells);
        rows.push(cells.map((cell) => cell.content));
        cursor += 1;
      }

      const firstStructuredRow = rowCells[0] ?? [];
      const firstRawRow = parseTableCells(lines[cursor - rowCells.length] ?? "").map(parseTableCell);
      const hasHeaders = firstRawRow.length > 0 && firstRawRow.every((cell) => cell.isHeader);
      const columnCount = countRenderedColumns(hasHeaders ? firstStructuredRow : rowCells[0] ?? []);
      const normalizedBodyRows = (hasHeaders ? rowCells.slice(1) : rowCells).map((row) =>
        trimOverflowCells(row, columnCount),
      );

      headerCells = hasHeaders ? trimOverflowCells(firstStructuredRow, columnCount) : null;

      addBlock({
        blockType: "table",
        headerCells,
        headers: headerCells ? headerCells.map((cell) => cell.content.trim()) : null,
        rowCells: normalizedBodyRows,
        rows: normalizedBodyRows.map((row) => row.map((cell) => cell.content.trim())),
        tableWidth,
      });
      continue;
    }

    if (isStructuredMacroLine(line)) {
      const macro = parseCodeMacro(trimmedLine);

      if (macro?.name === "__invalid__") {
        return createBlockParseError(
          "invalidMacro",
        );
      }

      if (macro && isSupportedCodeMacro(macro.name)) {
        if (macro.name === "image") {
          if (!macro.fields.id || !macro.fields.src) {
            return createBlockParseError("imageRequired");
          }

          addBlock({
            blockType: "image",
            alt: macro.fields.alt ? unescapeCodeValue(macro.fields.alt) : null,
            caption: macro.fields.caption ? unescapeCodeValue(macro.fields.caption) : null,
            imageIdentifier: unescapeCodeValue(macro.fields.id),
            imageSrc: decodeCodeUri(macro.fields.src),
            ...(macro.fields.width ? { imageWidth: normalizeWikiImageWidth(macro.fields.width) } : {}),
          });
          cursor += 1;
          continue;
        }

        if (macro.name === "gallery") {
          const rawImages = macro.fields.images;

          if (!rawImages) {
            return createBlockParseError("galleryRequired");
          }

          const images = splitEscaped(rawImages, ",").map((entry) => {
            const [imageIdentifier, imageSrc, alt = ""] = splitEscaped(entry, "@");

            if (!imageIdentifier || !imageSrc) {
              return null;
            }

            return {
              alt: alt ? unescapeCodeValue(alt) : null,
              imageIdentifier: unescapeCodeValue(imageIdentifier),
              imageSrc: decodeCodeUri(imageSrc),
            };
          });

          if (images.some((image) => image == null)) {
            return createBlockParseError(
              "galleryImageRequired",
            );
          }

          addBlock({
            blockType: "image_gallery",
            caption: macro.fields.caption ? unescapeCodeValue(macro.fields.caption) : null,
            ...(macro.fields.width ? { imageWidth: normalizeWikiImageWidth(macro.fields.width) } : {}),
            images: images.filter((image) => image != null),
          });
          cursor += 1;
          continue;
        }

        if (macro.name === "embed") {
          if (!macro.fields.provider || !macro.fields.id) {
            return createBlockParseError("embedRequired");
          }

          addBlock({
            blockType: "embed",
            caption: macro.fields.caption ? unescapeCodeValue(macro.fields.caption) : null,
            embedId: unescapeCodeValue(macro.fields.id),
            provider: unescapeCodeValue(macro.fields.provider) as WikiEmbedProvider,
          });
          cursor += 1;
          continue;
        }

        if (macro.name === "history") {
          const entries = parseHistoryCodeEntries(macro.fields);
          if (!entries) return createBlockParseError("invalidMacro");

          addBlock({ blockType: "history", entries });
          cursor += 1;
          continue;
        }

        const identifiers = (macro.fields.ids ?? "")
          .split(",")
          .map(unescapeCodeValue)
          .filter(Boolean);
        const cardShape = wikiProfileCardShapeSchema.optional().safeParse(macro.fields.shape);
        if (!cardShape.success) return createBlockParseError("invalidMacro");

        addBlock({
          blockType: "profile_card_list",
          ...(cardShape.data ? { cardShape: cardShape.data } : {}),
          relatedResourceType: macro.fields.resourceType
            ? (unescapeCodeValue(macro.fields.resourceType) as WikiDraftDetail["resourceType"])
            : null,
          title: macro.fields.title ? unescapeCodeValue(macro.fields.title) : null,
          wikiIdentifiers: identifiers,
        });
        cursor += 1;
        continue;
      }
    }

    const includeEmbedBlock = parseIncludeEmbedBlock(line);

    if (includeEmbedBlock) {
      addBlock(includeEmbedBlock);
      cursor += 1;
      continue;
    }

    const textLines: string[] = [];

    while (cursor < lines.length) {
      const currentLine = lines[cursor];

      if (!currentLine.trim()) {
        break;
      }

      if (isStructuredBlockStart(currentLine)) {
        break;
      }

      textLines.push(currentLine);
      cursor += 1;
    }

    const textContent = textLines.join("\n");

    for (const warning of detectTextFallbackWarnings(textContent)) {
      warnings.add(warning);
    }

    addBlock({
      blockType: "text",
      content: textContent,
    });
  }

  return {
    ok: true,
    blocks,
    warnings: [...warnings],
  };
};

const appendBlocksToSection = (
  section: WikiSection,
  blocks: WikiBlock[],
): WikiSection => {
  const existingCount = section.contents.length;
  const normalizedBlocks = blocks.map((block, index) => ({
    ...block,
    displayOrder: (existingCount + index + 1) * DISPLAY_ORDER_STEP,
  }));

  return {
    ...section,
    contents: [...section.contents, ...normalizedBlocks],
  };
};

export const parseWikiSectionsFromCode = (code: string): WikiCodeParseResult => {
  const normalizedCode = code.replaceAll("\r\n", "\n");

  if (!normalizedCode.trim()) {
    return createParseSuccess([]);
  }

  const lines = normalizedCode.split("\n");
  const rootSections: WikiSection[] = [];
  let sectionStack: WikiSection[] = [];
  let pendingLines: string[] = [];
  let headingBaseDepth: number | null = null;
  const warnings = new Set<WikiCodeWarningCode>();

  const replaceSectionInStack = (nextSection: WikiSection) => {
    const depthIndex = nextSection.depth - 1;
    sectionStack = sectionStack.map((section, index) =>
      index === depthIndex ? nextSection : section,
    );

    if (nextSection.depth === 1) {
      const rootIndex = rootSections.findIndex(
        (section) => section.sectionIdentifier === nextSection.sectionIdentifier,
      );

      if (rootIndex >= 0) {
        rootSections[rootIndex] = nextSection;
      }

      return;
    }

    const parent = sectionStack[depthIndex - 1];

    if (!parent) {
      return;
    }

    const nextParent = {
      ...parent,
      contents: parent.contents.map((content) =>
        isWikiSection(content) && content.sectionIdentifier === nextSection.sectionIdentifier
          ? nextSection
          : content,
      ),
    };

    replaceSectionInStack(nextParent);
  };

  const flushPendingLines = (): WikiCodeParseResult | null => {
    const currentSection = sectionStack.at(-1);

    if (!currentSection || pendingLines.every((line) => !line.trim())) {
      pendingLines = [];
      return null;
    }

    const parsedBlocks = parseCodeBlocks(pendingLines);

    if (!parsedBlocks.ok) {
      return createParseError(parsedBlocks.code);
    }

    for (const warning of parsedBlocks.warnings) {
      warnings.add(warning);
    }

    replaceSectionInStack(appendBlocksToSection(currentSection, parsedBlocks.blocks));
    pendingLines = [];
    return null;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    const headingDepth = getHeadingDepth(trimmedLine);

    if (headingDepth) {
      const flushResult = flushPendingLines();

      if (flushResult) {
        return flushResult;
      }

      headingBaseDepth ??= headingDepth >= 2 ? 2 : 1;
      const normalizedHeadingDepth = headingDepth - headingBaseDepth + 1;

      if (normalizedHeadingDepth < 1 || normalizedHeadingDepth > WIKI_SECTION_MAX_DEPTH) {
        return createParseError(
          "headingDepth",
        );
      }

      if (normalizedHeadingDepth > sectionStack.length + 1) {
        return createParseError(
          "headingSkipped",
        );
      }

      const title = getHeadingTitle(trimmedLine);

      if (!title) {
        return createParseError("headingTitleRequired");
      }

      sectionStack = sectionStack.slice(0, normalizedHeadingDepth - 1);
      const parent = sectionStack.at(-1);
      const nextSection: WikiSection = {
        type: "section",
        sectionIdentifier: createWikiContentIdentifier("section"),
        title,
        displayOrder: getNextDisplayOrder(parent ? parent.contents : rootSections),
        depth: normalizedHeadingDepth,
        contents: [],
      };

      if (parent) {
        const nextParent = {
          ...parent,
          contents: [...parent.contents, nextSection],
        };

        replaceSectionInStack(nextParent);
      } else {
        rootSections.push(nextSection);
      }

      sectionStack = [...sectionStack, nextSection];
      continue;
    }

    if (!sectionStack.length && trimmedLine) {
      return createParseError(
        "headingRequired",
      );
    }

    if (sectionStack.length) {
      pendingLines.push(line);
    }
  }

  const flushResult = flushPendingLines();

  if (flushResult) {
    return flushResult;
  }

  return createParseSuccess(normalizeWikiSectionsForEditing(rootSections), [...warnings]);
};
