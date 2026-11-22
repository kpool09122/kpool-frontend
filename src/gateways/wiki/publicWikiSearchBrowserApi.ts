import { z } from "zod";
import type { Locale } from "@/i18n/locales";

const searchItemSchema = z.object({
  wikiIdentifier: z.string(),
  name: z.string(),
  slug: z.string(),
  language: z.string(),
});

const searchResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("empty") }),
  z.object({
    status: z.literal("success"),
    data: z.object({ wikis: z.array(searchItemSchema) }),
  }),
]);

export type PublicWikiSearchItem = z.infer<typeof searchItemSchema>;

export async function searchPublicWikis(language: Locale, keyword: string, signal: AbortSignal): Promise<PublicWikiSearchItem[]> {
  const params = new URLSearchParams({ language, keyword: keyword.trim(), perPage: "10", page: "1" });
  const response = await fetch(`/api/wiki/public-wikis?${params}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("Wiki search failed");
  const result = searchResponseSchema.safeParse(await response.json());
  if (!result.success) throw new Error("Invalid Wiki search response");
  return result.data.status === "empty" ? [] : result.data.data.wikis;
}
