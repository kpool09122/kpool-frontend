import { type WikiBlockType } from "@kpool/wiki";

export type WikiPreviewMode = "light" | "dark";
export type WikiEditorMode = "gui" | "code";

export const blockTypes: WikiBlockType[] = [
  "text",
  "image",
  "image_gallery",
  "embed",
  "quote",
  "list",
  "table",
  "profile_card_list",
];

export const blockTypeLabels: Record<WikiBlockType, string> = {
  text: "Text",
  image: "Image",
  image_gallery: "Gallery",
  embed: "Embed",
  quote: "Quote",
  list: "List",
  table: "Table",
  profile_card_list: "Profiles",
};

export const themeColorOptions = [
  "#d94f70",
  "#00d084",
  "#4c5cff",
  "#f1a81f",
  "#1f9a8a",
  "#7c3aed",
];

export const getString = (formData: FormData, name: string): string =>
  String(formData.get(name) ?? "");

export const getLines = (formData: FormData, name: string): string[] =>
  getString(formData, name)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export type InlineMarkdownFormat = "bold" | "italic" | "link" | "strike";

type ApplyInlineMarkdownFormatInput = {
  content: string;
  format: InlineMarkdownFormat;
  selectionStart: number;
  selectionEnd: number;
  url?: string;
};

export type InlineMarkdownToken =
  | { kind: "text"; text: string }
  | { kind: "strong"; children: InlineMarkdownToken[] }
  | { kind: "emphasis"; children: InlineMarkdownToken[] }
  | { kind: "strikethrough"; children: InlineMarkdownToken[] }
  | { kind: "link"; children: InlineMarkdownToken[]; href: string };

const markdownWrapMap: Record<Exclude<InlineMarkdownFormat, "link">, string> = {
  bold: "**",
  italic: "_",
  strike: "~~",
};

const clampSelection = (value: string, selection: number): number =>
  Math.min(Math.max(selection, 0), value.length);

const getSelectionRange = (
  content: string,
  selectionStart: number,
  selectionEnd: number,
): [number, number] => {
  const start = clampSelection(content, Math.min(selectionStart, selectionEnd));
  const end = clampSelection(content, Math.max(selectionStart, selectionEnd));

  return [start, end];
};

const buildWrappedSelection = (
  content: string,
  selectionStart: number,
  selectionEnd: number,
  wrapper: string,
) => {
  const [start, end] = getSelectionRange(content, selectionStart, selectionEnd);
  const selectedText = content.slice(start, end);
  const replacement = `${wrapper}${selectedText}${wrapper}`;

  return {
    content: `${content.slice(0, start)}${replacement}${content.slice(end)}`,
    selectionEnd: start + replacement.length,
    selectionStart: start + replacement.length,
  };
};

export const applyInlineMarkdownFormat = ({
  content,
  format,
  selectionStart,
  selectionEnd,
  url,
}: ApplyInlineMarkdownFormatInput) => {
  if (format === "link") {
    const href = url?.trim();

    if (!href) {
      return { content, selectionStart, selectionEnd };
    }

    const [start, end] = getSelectionRange(content, selectionStart, selectionEnd);
    const selectedText = content.slice(start, end) || "link";
    const replacement = `[${selectedText}](${href})`;

    return {
      content: `${content.slice(0, start)}${replacement}${content.slice(end)}`,
      selectionEnd: start + replacement.length,
      selectionStart: start + replacement.length,
    };
  }

  return buildWrappedSelection(
    content,
    selectionStart,
    selectionEnd,
    markdownWrapMap[format],
  );
};

const findClosingMarker = (content: string, marker: string, fromIndex: number): number =>
  content.indexOf(marker, fromIndex);

const parseLinkToken = (content: string, startIndex: number): { node: InlineMarkdownToken; nextIndex: number } | null => {
  const textEnd = content.indexOf("]", startIndex + 1);

  if (textEnd < 0 || content[textEnd + 1] !== "(") {
    return null;
  }

  const hrefEnd = content.indexOf(")", textEnd + 2);

  if (hrefEnd < 0) {
    return null;
  }

  const href = content.slice(textEnd + 2, hrefEnd);

  if (!/^https?:\/\/\S+$/.test(href)) {
    return null;
  }

  const text = content.slice(startIndex + 1, textEnd);

  return {
    nextIndex: hrefEnd + 1,
    node: {
      children: parseInlineMarkdown(text),
      href,
      kind: "link",
    },
  };
};

const parseWrappedToken = (
  content: string,
  startIndex: number,
  marker: string,
  kind: Extract<InlineMarkdownToken["kind"], "strong" | "emphasis" | "strikethrough">,
): { node: InlineMarkdownToken; nextIndex: number } | null => {
  const contentStart = startIndex + marker.length;
  const closingIndex = findClosingMarker(content, marker, contentStart);

  if (closingIndex < 0 || closingIndex === contentStart) {
    return null;
  }

  return {
    nextIndex: closingIndex + marker.length,
    node: {
      children: parseInlineMarkdown(content.slice(contentStart, closingIndex)),
      kind,
    },
  };
};

export const parseInlineMarkdown = (content: string): InlineMarkdownToken[] => {
  const tokens: InlineMarkdownToken[] = [];
  let cursor = 0;
  let textBuffer = "";

  const flushText = () => {
    if (!textBuffer) {
      return;
    }

    tokens.push({ kind: "text", text: textBuffer });
    textBuffer = "";
  };

  while (cursor < content.length) {
    const slice = content.slice(cursor);
    const token =
      (slice.startsWith("**") && parseWrappedToken(content, cursor, "**", "strong")) ||
      (slice.startsWith("~~") && parseWrappedToken(content, cursor, "~~", "strikethrough")) ||
      (slice.startsWith("_") && parseWrappedToken(content, cursor, "_", "emphasis")) ||
      (slice.startsWith("[") && parseLinkToken(content, cursor));

    if (token) {
      flushText();
      tokens.push(token.node);
      cursor = token.nextIndex;
      continue;
    }

    textBuffer += content[cursor];
    cursor += 1;
  }

  flushText();

  return tokens;
};

type TiptapMark = {
  attrs?: {
    href?: string;
  };
  type?: string;
};

type TiptapNode = {
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
  type?: string;
};

const escapeHtml = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const inlineTokensToHtml = (tokens: InlineMarkdownToken[]): string =>
  tokens
    .map((token) => {
      switch (token.kind) {
        case "text":
          return escapeHtml(token.text).replaceAll("\n", "<br>");
        case "strong":
          return `<strong>${inlineTokensToHtml(token.children)}</strong>`;
        case "emphasis":
          return `<em>${inlineTokensToHtml(token.children)}</em>`;
        case "strikethrough":
          return `<del>${inlineTokensToHtml(token.children)}</del>`;
        case "link":
          return `<a href="${escapeHtml(token.href)}">${inlineTokensToHtml(token.children)}</a>`;
      }
    })
    .join("");

export const inlineMarkdownToTiptapHtml = (content: string): string =>
  `<p>${inlineTokensToHtml(parseInlineMarkdown(content))}</p>`;

const applyMarksToText = (text: string, marks: TiptapMark[] = []): string =>
  marks.reduce((current, mark) => {
    switch (mark.type) {
      case "bold":
        return `**${current}**`;
      case "italic":
        return `_${current}_`;
      case "strike":
        return `~~${current}~~`;
      case "link":
        return `[${current}](${mark.attrs?.href ?? ""})`;
      default:
        return current;
    }
  }, text);

const serializeTiptapNode = (node: TiptapNode): string => {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(serializeTiptapNode).join("");
    case "paragraph":
      return (node.content ?? []).map(serializeTiptapNode).join("");
    case "hardBreak":
      return "\n";
    case "text":
      return applyMarksToText(node.text ?? "", node.marks);
    default:
      return (node.content ?? []).map(serializeTiptapNode).join("");
  }
};

export const serializeTiptapJsonToInlineMarkdown = (node: TiptapNode): string =>
  serializeTiptapNode(node);
