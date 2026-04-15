import { z } from "zod";

export type WikiSection = {
  sectionIdentifier: string;
  title: string;
  displayOrder: number;
  depth: number;
  body: string;
  children: WikiSection[];
};

const wikiSectionSchema: z.ZodType<WikiSection> = z.lazy(() =>
  z.object({
    sectionIdentifier: z.string(),
    title: z.string(),
    displayOrder: z.number().int(),
    depth: z.number().int().min(1),
    body: z.string(),
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
  summary: z.string(),
  basic: wikiBasicSchema,
  sections: z.array(wikiSectionSchema),
});

export type WikiBasic = z.infer<typeof wikiBasicSchema>;
export type WikiDetail = z.infer<typeof wikiDetailSchema>;
