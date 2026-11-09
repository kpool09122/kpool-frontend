import { fromMarkdown } from "mdast-util-from-markdown";

const descriptionMaxLength = 160;

type DescriptionNode = {
  type: string;
  value?: string;
  children?: DescriptionNode[];
};

const readText = (node: DescriptionNode): string => {
  switch (node.type) {
    case "text":
    case "inlineCode":
      return node.value ?? "";
    case "break":
      return " ";
    case "html":
    case "image":
    case "imageReference":
    case "definition":
    case "code":
      return "";
    default: {
      const separator = ["root", "blockquote", "list", "listItem"].includes(node.type)
        ? " " : "";
      return (node.children ?? []).map(readText).join(separator);
    }
  }
};

/** Summarize rendered prose without Markdown markers, destinations, or image alt text. */
export const buildMarkdownDescription = (markdown: string): string => {
  const text = readText(fromMarkdown(markdown)).replace(/\s+/gu, " ").trim();
  const characters = Array.from(text);
  return characters.length <= descriptionMaxLength
    ? text
    : `${characters.slice(0, descriptionMaxLength - 1).join("").trimEnd()}…`;
};
