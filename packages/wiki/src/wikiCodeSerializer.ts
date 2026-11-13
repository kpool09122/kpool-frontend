import type { WikiBlock, WikiSection } from "./types/wiki";
import {
  encodeCodeUri,
  escapeCodeValue,
  serializeCodeField,
  serializeCodeMacro,
  serializeHistoryCodeText,
} from "./wikiCodeSyntax";
import { normalizeWikiImageWidth } from "./wikiImageLayout";
import {
  isWikiBlock,
  isWikiSection,
  normalizeWikiSectionContents,
  sortWikiSectionContents,
} from "./wikiSectionModel";

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
        block.imageWidth == null ? null : `width:${normalizeWikiImageWidth(block.imageWidth)}`,
        serializeCodeField("caption", block.caption),
        serializeCodeField("alt", block.alt),
      ].filter((value): value is string => Boolean(value)));
    case "image_gallery":
      return serializeCodeMacro("gallery", [
        block.imageWidth == null ? null : `width:${normalizeWikiImageWidth(block.imageWidth)}`,
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
    case "history":
      return serializeCodeMacro("history", block.entries.flatMap(({ year, title, detail }, index) => {
        const row = index + 1;
        return [
          `year${row}:${year}`,
          `title${row}:${serializeHistoryCodeText(title)}`,
          ...(detail == null ? [] : [`detail${row}:${serializeHistoryCodeText(detail)}`]),
        ];
      }));
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
        serializeCodeField("resourceType", block.relatedResourceType),
        serializeCodeField("shape", block.cardShape),
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
