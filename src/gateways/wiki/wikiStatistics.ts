import { z } from "zod";
import { withWikiApiPrefix } from "@kpool/wiki";
import { publicWikiCacheTag } from "./publicWikiCache";

const count = z.number().int().nonnegative();
const resourceTypesSchema = z.object({ agency: count, group: count, talent: count, song: count });
const groupTypesSchema = z.object({ boy_group: count, girl_group: count, co_ed: count, unknown: count });
const breakdownSchema = z.object({ resourceTypes: resourceTypesSchema, groupTypes: groupTypesSchema });
const sum = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);
export const wikiStatisticsSchema = z.object({
  total: count,
  languages: z.object({ ja: count, en: count, ko: count }),
  resourceTypes: resourceTypesSchema,
  groupTypes: groupTypesSchema,
  byLanguage: z.object({ ja: breakdownSchema, en: breakdownSchema, ko: breakdownSchema }),
}).refine((data) => {
  const breakdowns = Object.values(data.byLanguage);
  return sum(data.languages) === data.total &&
    sum(data.resourceTypes) === data.total &&
    sum(data.groupTypes) === data.resourceTypes.group &&
    Object.entries(data.byLanguage).every(([language, breakdown]) =>
      sum(breakdown.resourceTypes) === data.languages[language as keyof typeof data.languages] &&
      sum(breakdown.groupTypes) === breakdown.resourceTypes.group,
    ) &&
    Object.entries(data.resourceTypes).every(([key, total]) =>
      breakdowns.reduce((sum, breakdown) => sum + breakdown.resourceTypes[key as keyof typeof data.resourceTypes], 0) === total,
    ) &&
    Object.entries(data.groupTypes).every(([key, total]) =>
      breakdowns.reduce((sum, breakdown) => sum + breakdown.groupTypes[key as keyof typeof data.groupTypes], 0) === total,
    );
});

export type WikiStatistics = z.infer<typeof wikiStatisticsSchema>;

export async function loadWikiStatistics(): Promise<WikiStatistics | null> {
  const baseUrl = process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  if (!baseUrl) return null;
  try {
    const response = await fetch(`${withWikiApiPrefix(baseUrl)}/wikis/statistics`, {
      headers: { accept: "application/json" },
      next: { revalidate: 300, tags: [publicWikiCacheTag] },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const result = wikiStatisticsSchema.safeParse(await response.json());
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
