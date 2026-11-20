import { z } from "zod";
import { withWikiApiPrefix } from "@kpool/wiki";
import { publicWikiCacheTag } from "./publicWikiCache";

const count = z.number().int().nonnegative();
export const wikiStatisticsSchema = z.object({
  total: count,
  languages: z.object({ ja: count, en: count, ko: count }),
  resourceTypes: z.object({ agency: count, group: count, talent: count, song: count }),
  groupTypes: z.object({ boy_group: count, girl_group: count, co_ed: count, unknown: count }),
}).refine((data) =>
  Object.values(data.languages).reduce((a, b) => a + b, 0) === data.total &&
  Object.values(data.resourceTypes).reduce((a, b) => a + b, 0) === data.total &&
  Object.values(data.groupTypes).reduce((a, b) => a + b, 0) === data.resourceTypes.group,
);

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
