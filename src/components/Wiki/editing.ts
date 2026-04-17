import { type WikiBlockType } from "@kpool/wiki";

export type WikiPreviewMode = "light" | "dark";

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
