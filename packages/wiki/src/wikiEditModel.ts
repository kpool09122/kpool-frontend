import type {
  WikiBlock,
  WikiBlockType,
  WikiDetail,
  WikiEmbedBlock,
  WikiEmbedProvider,
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
      row_cells?: Array<Array<{ content: string; colspan?: number }>>;
      header_cells?: Array<{ content: string; colspan?: number }> | null;
      table_width?: number | null;
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

export type WikiCodeParseResult =
  | {
      ok: true;
      sections: WikiSection[];
      warnings: string[];
    }
  | {
      ok: false;
      message: string;
    };

const DISPLAY_ORDER_STEP = 10;

const escapeCodeValue = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll("|", "\\|").replaceAll(",", "\\,");

const encodeCodeUri = (value: string): string => encodeURIComponent(value);

const decodeCodeUri = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const unescapeCodeValue = (value: string): string => {
  let unescaped = "";
  let isEscaped = false;

  for (const character of value) {
    if (isEscaped) {
      unescaped += character;
      isEscaped = false;
      continue;
    }

    if (character === "\\") {
      isEscaped = true;
      continue;
    }

    unescaped += character;
  }

  if (isEscaped) {
    unescaped += "\\";
  }

  return unescaped;
};

const splitEscaped = (value: string, delimiter: string): string[] => {
  const parts: string[] = [];
  let current = "";
  let isEscaped = false;

  for (const character of value) {
    if (isEscaped) {
      current += character;
      isEscaped = false;
      continue;
    }

    if (character === "\\") {
      isEscaped = true;
      continue;
    }

    if (character === delimiter) {
      parts.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  if (isEscaped) {
    current += "\\";
  }

  parts.push(current);

  return parts;
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

const serializeCodeMacro = (name: string, values: string[]): string =>
  `[[${name}${values.length > 0 ? `|${values.join("|")}` : ""}]]`;

const serializeCodeField = (key: string, value: string | null | undefined): string | null =>
  value == null ? null : `${key}:${escapeCodeValue(value)}`;

const serializeTableCell = (
  cell: { content: string; colspan?: number },
  options?: { isHeader?: boolean; tableWidth?: number | null },
): string => {
  const attributes = [
    options?.tableWidth ? `<tablewidth=${options.tableWidth}>` : null,
    cell.colspan && cell.colspan > 1 ? `<-${cell.colspan}>` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("");

  const content = `${options?.isHeader ? "!" : ""}${cell.content}`.trimEnd();

  return [attributes, content].filter(Boolean).join(attributes && content ? " " : "");
};

const serializeTableRow = (
  cells: string[],
  isHeader = false,
  options?: { structuredCells?: Array<{ content: string; colspan?: number }>; tableWidth?: number | null },
): string => {
  const sourceCells =
    options?.structuredCells ??
    cells.map((cell) => ({
      content: cell,
    }));

  return `|| ${sourceCells
    .map((cell, index) =>
      serializeTableCell(cell, {
        isHeader,
        tableWidth: index === 0 ? options?.tableWidth : null,
      }),
    )
    .join(" || ")} ||`;
};

const serializeWikiBlockToCode = (block: WikiBlock): string => {
  switch (block.blockType) {
    case "text":
      return block.content;
    case "image":
      return serializeCodeMacro("image", [
        `id:${escapeCodeValue(block.imageIdentifier)}`,
        `src:${encodeCodeUri(block.imageSrc)}`,
        serializeCodeField("caption", block.caption),
        serializeCodeField("alt", block.alt),
      ].filter((value): value is string => Boolean(value)));
    case "image_gallery":
      return serializeCodeMacro("gallery", [
        `images:${block.images
          .map((image) =>
            [
              escapeCodeValue(image.imageIdentifier),
              encodeCodeUri(image.imageSrc),
              escapeCodeValue(image.alt ?? ""),
            ].join("@"),
          )
          .join(",")}`,
        serializeCodeField("caption", block.caption),
      ].filter((value): value is string => Boolean(value)));
    case "embed":
      return serializeCodeMacro("embed", [
        `provider:${escapeCodeValue(block.provider)}`,
        `id:${escapeCodeValue(block.embedId)}`,
        serializeCodeField("caption", block.caption),
      ].filter((value): value is string => Boolean(value)));
    case "quote":
      return [
        ...block.content.split("\n").map((line) => `> ${line}`),
        ...(block.source ? [`> -- ${block.source}`] : []),
      ].join("\n");
    case "list":
      return block.items
        .map((item, index) =>
          block.listType === "numbered" ? `${index + 1}. ${item}` : `* ${item}`,
        )
        .join("\n");
    case "table":
      return [
        ...(block.headers
          ? [
              serializeTableRow(block.headers, true, {
                structuredCells: block.headerCells ?? undefined,
                tableWidth: block.tableWidth,
              }),
            ]
          : []),
        ...block.rows.map((row, index) =>
          serializeTableRow(row, false, {
            structuredCells: block.rowCells?.[index],
          }),
        ),
      ].join("\n");
    case "profile_card_list":
      return serializeCodeMacro("profiles", [
        `ids:${block.wikiIdentifiers.map(escapeCodeValue).join(",")}`,
        serializeCodeField("title", block.title),
      ].filter((value): value is string => Boolean(value)));
  }
};

const serializeWikiSectionToCode = (section: WikiSection): string => {
  const normalizedSection = normalizeWikiSectionContents(section);
  const headingDepth = normalizedSection.depth + 1;
  const heading = `${"=".repeat(headingDepth)} ${normalizedSection.title} ${"=".repeat(headingDepth)}`;
  const sortedContents = sortWikiSectionContents(normalizedSection.contents);
  const contents = [
    ...sortedContents
      .filter(isWikiBlock)
      .map(serializeWikiBlockToCode),
    ...sortedContents
      .filter(isWikiSection)
      .map(serializeWikiSectionToCode),
  ];

  return [heading, ...contents.filter(Boolean)].join("\n\n");
};

export const serializeWikiSectionsToCode = (sections: WikiSection[]): string =>
  sortWikiSectionContents(sections)
    .map(serializeWikiSectionToCode)
    .join("\n\n")
    .trim();

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

const createParseError = (message: string): WikiCodeParseResult => ({
  ok: false,
  message,
});

const createParseSuccess = (
  sections: WikiSection[],
  warnings: string[] = [],
): WikiCodeParseResult => ({
  ok: true,
  sections,
  warnings,
});

const parseCodeField = (part: string): [string, string] | null => {
  const dividerIndex = part.indexOf(":");

  if (dividerIndex <= 0) {
    return null;
  }

  return [
    part.slice(0, dividerIndex).trim(),
    part.slice(dividerIndex + 1).trim(),
  ];
};

const parseCodeMacro = (
  line: string,
): { name: string; fields: Record<string, string> } | null => {
  if (!line.startsWith("[[")) {
    return null;
  }

  if (!line.endsWith("]]")) {
    return { name: "__invalid__", fields: {} };
  }

  const rawContent = line.slice(2, -2).trim();
  const [name, ...parts] = splitEscaped(rawContent, "|");
  const fields = parts.reduce<Record<string, string>>((result, part) => {
    const field = parseCodeField(part);

    if (!field) {
      return result;
    }

    result[field[0]] = field[1];
    return result;
  }, {});

  return { name: name.trim(), fields };
};

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
      warnings: string[];
    }
  | {
      ok: false;
      message: string;
    };

const createBlockParseError = (message: string): WikiCodeBlocksParseResult => ({
  ok: false,
  message,
});

const isSupportedCodeMacro = (name: string): boolean =>
  ["image", "gallery", "embed", "profiles"].includes(name);

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

const detectTextFallbackWarnings = (content: string): string[] => {
  const warnings = new Set<string>();

  if (/\[\[(파일|File):[^[\]]+\]\]/.test(content)) {
    warnings.add("File link syntax is still preserved as plain text in the GUI editor.");
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
  const warnings = new Set<string>();
  let cursor = 0;

  const addBlock = (block: Record<string, unknown> & { blockType: WikiBlockType }) => {
    blocks.push({
      ...block,
      blockIdentifier: createIdentifier(`block-${block.blockType.replaceAll("_", "-")}`),
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
            "Extended table syntax was preserved as plain cell text because the GUI table editor cannot model merged cells or attributes yet.",
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
          "Code mode could not parse a structured block. Fix the macro syntax or clear the draft.",
        );
      }

      if (macro && isSupportedCodeMacro(macro.name)) {
        if (macro.name === "image") {
          if (!macro.fields.id || !macro.fields.src) {
            return createBlockParseError("Image blocks require both id and src.");
          }

          addBlock({
            blockType: "image",
            alt: macro.fields.alt ? unescapeCodeValue(macro.fields.alt) : null,
            caption: macro.fields.caption ? unescapeCodeValue(macro.fields.caption) : null,
            imageIdentifier: unescapeCodeValue(macro.fields.id),
            imageSrc: decodeCodeUri(macro.fields.src),
          });
          cursor += 1;
          continue;
        }

        if (macro.name === "gallery") {
          const rawImages = macro.fields.images;

          if (!rawImages) {
            return createBlockParseError("Gallery blocks require at least one image entry.");
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
              "Gallery image entries must include both identifier and src.",
            );
          }

          addBlock({
            blockType: "image_gallery",
            caption: macro.fields.caption ? unescapeCodeValue(macro.fields.caption) : null,
            images: images.filter((image) => image != null),
          });
          cursor += 1;
          continue;
        }

        if (macro.name === "embed") {
          if (!macro.fields.provider || !macro.fields.id) {
            return createBlockParseError("Embed blocks require provider and id.");
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

        const identifiers = (macro.fields.ids ?? "")
          .split(",")
          .map(unescapeCodeValue)
          .filter(Boolean);

        addBlock({
          blockType: "profile_card_list",
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
  const warnings = new Set<string>();

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
      children: parent.children.map((child) =>
        child.sectionIdentifier === nextSection.sectionIdentifier ? nextSection : child,
      ),
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
      return createParseError(parsedBlocks.message);
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
          `Code mode supports headings up to depth ${WIKI_SECTION_MAX_DEPTH}.`,
        );
      }

      if (normalizedHeadingDepth > sectionStack.length + 1) {
        return createParseError(
          "Heading depth cannot skip levels. Add the missing parent section first.",
        );
      }

      const title = getHeadingTitle(trimmedLine);

      if (!title) {
        return createParseError("Section headings must include a title.");
      }

      sectionStack = sectionStack.slice(0, normalizedHeadingDepth - 1);
      const parent = sectionStack.at(-1);
      const nextSection: WikiSection = {
        type: "section",
        sectionIdentifier: createIdentifier("section"),
        title,
        displayOrder: getNextDisplayOrder(parent ? parent.contents : rootSections),
        depth: normalizedHeadingDepth,
        contents: [],
        children: [],
      };

      if (parent) {
        const nextParent = {
          ...parent,
          children: [...parent.children, nextSection],
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
        "Add a top-level heading like = Overview = before writing section content.",
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

const getNextDisplayOrder = (contents: WikiSectionContent[]): number =>
  contents.reduce((max, content) => Math.max(max, content.displayOrder), 0) +
  DISPLAY_ORDER_STEP;

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
        row_cells: content.rowCells,
        header_cells: content.headerCells ?? null,
        table_width: content.tableWidth ?? null,
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
