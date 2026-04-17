import { z } from "zod";

export type WikiSection = {
  type: "section";
  sectionIdentifier: string;
  title: string;
  displayOrder: number;
  depth: number;
  contents: WikiSectionContent[];
  children: WikiSection[];
};

export type WikiBlockType =
  | "text"
  | "image"
  | "image_gallery"
  | "embed"
  | "quote"
  | "list"
  | "table"
  | "profile_card_list";

export type WikiEmbedProvider = "youtube" | "spotify" | "x" | "tiktok";

export type WikiListType = "bullet" | "numbered";

export type WikiTextBlock = {
  blockIdentifier: string;
  blockType: "text";
  displayOrder: number;
  content: string;
};

export type WikiImageBlock = {
  blockIdentifier: string;
  blockType: "image";
  displayOrder: number;
  imageIdentifier: string;
  imageSrc: string;
  caption: string | null;
  alt: string | null;
};

export type WikiImageGalleryBlock = {
  blockIdentifier: string;
  blockType: "image_gallery";
  displayOrder: number;
  images: Array<{
    imageIdentifier: string;
    imageSrc: string;
    alt: string | null;
  }>;
  caption: string | null;
};

export type WikiEmbedBlock = {
  blockIdentifier: string;
  blockType: "embed";
  displayOrder: number;
  provider: WikiEmbedProvider;
  embedId: string;
  caption: string | null;
};

export type WikiQuoteBlock = {
  blockIdentifier: string;
  blockType: "quote";
  displayOrder: number;
  content: string;
  source: string | null;
};

export type WikiListBlock = {
  blockIdentifier: string;
  blockType: "list";
  displayOrder: number;
  listType: WikiListType;
  items: string[];
};

export type WikiTableBlock = {
  blockIdentifier: string;
  blockType: "table";
  displayOrder: number;
  headers: string[] | null;
  rows: string[][];
};

export type WikiProfileCardListBlock = {
  blockIdentifier: string;
  blockType: "profile_card_list";
  displayOrder: number;
  wikiIdentifiers: string[];
  title: string | null;
};

export type WikiBlock =
  | WikiTextBlock
  | WikiImageBlock
  | WikiImageGalleryBlock
  | WikiEmbedBlock
  | WikiQuoteBlock
  | WikiListBlock
  | WikiTableBlock
  | WikiProfileCardListBlock;

export type WikiSectionContent = WikiSection | WikiBlock;

const wikiBlockBaseSchema = z.object({
  blockIdentifier: z.string(),
  displayOrder: z.number().int(),
});

const wikiBlockSchema = z.discriminatedUnion("blockType", [
  wikiBlockBaseSchema.extend({
    blockType: z.literal("text"),
    content: z.string(),
  }),
  wikiBlockBaseSchema.extend({
    blockType: z.literal("image"),
    imageIdentifier: z.string(),
    imageSrc: z.string(),
    caption: z.string().nullable(),
    alt: z.string().nullable(),
  }),
  wikiBlockBaseSchema.extend({
    blockType: z.literal("image_gallery"),
    images: z.array(
      z.object({
        imageIdentifier: z.string(),
        imageSrc: z.string(),
        alt: z.string().nullable(),
      }),
    ),
    caption: z.string().nullable(),
  }),
  wikiBlockBaseSchema.extend({
    blockType: z.literal("embed"),
    provider: z.enum(["youtube", "spotify", "x", "tiktok"]),
    embedId: z.string(),
    caption: z.string().nullable(),
  }),
  wikiBlockBaseSchema.extend({
    blockType: z.literal("quote"),
    content: z.string(),
    source: z.string().nullable(),
  }),
  wikiBlockBaseSchema.extend({
    blockType: z.literal("list"),
    listType: z.enum(["bullet", "numbered"]),
    items: z.array(z.string()),
  }),
  wikiBlockBaseSchema.extend({
    blockType: z.literal("table"),
    headers: z.array(z.string()).nullable(),
    rows: z.array(z.array(z.string())),
  }),
  wikiBlockBaseSchema.extend({
    blockType: z.literal("profile_card_list"),
    wikiIdentifiers: z.array(z.string()),
    title: z.string().nullable(),
  }),
]);

const wikiSectionSchema: z.ZodType<WikiSection> = z.lazy(() =>
  z.object({
    type: z.literal("section"),
    sectionIdentifier: z.string(),
    title: z.string(),
    displayOrder: z.number().int(),
    depth: z.number().int().min(1),
    contents: z.array(z.union([wikiSectionSchema, wikiBlockSchema])),
    children: z.array(wikiSectionSchema),
  }),
);

export const wikiBasicSchema = z.object({
  name: z.string(),
  normalizedName: z.string(),
  resourceType: z.literal("group"),
  groupType: z.string(),
  status: z.string(),
  generation: z.string(),
  debutDate: z.string(),
  fandomName: z.string(),
  emoji: z.string(),
  representativeSymbol: z.string(),
  officialColors: z.array(z.string()),
  agencyName: z.string().nullable(),
});

export const wikiDetailSchema = z.object({
  wikiIdentifier: z.string(),
  slug: z.string(),
  language: z.string(),
  resourceType: z.literal("group"),
  version: z.number().int(),
  themeColor: z.string().nullable().optional(),
  heroImage: z.object({
    src: z.string(),
    alt: z.string(),
  }),
  basic: wikiBasicSchema,
  sections: z.array(wikiSectionSchema),
});

export type WikiBasic = z.infer<typeof wikiBasicSchema>;
export type WikiDetail = z.infer<typeof wikiDetailSchema>;
