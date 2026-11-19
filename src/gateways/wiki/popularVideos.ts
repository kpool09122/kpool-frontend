import { z } from "zod";
import { isVideoId, withWikiApiPrefix } from "@kpool/wiki";
import { publicWikiCacheTag } from "./publicWikiCache";

export const popularVideoSchema = z.object({
  videoLinkIdentifier: z.string().uuid(),
  provider: z.enum(["youtube", "tiktok"]),
  externalVideoId: z.string(),
  url: z.string().url(),
  title: z.string(),
  thumbnailUrl: z.string().nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  likeCount: z.number().int().positive(),
  language: z.enum(["ja", "en", "ko"]),
  slug: z.string().min(1),
}).refine((video) => isVideoId(video.provider, video.externalVideoId));

const responseSchema = z.object({ videos: z.array(popularVideoSchema).max(20) });
export type PopularVideo = z.infer<typeof popularVideoSchema>;
export type PopularVideosState =
  | { status: "success"; videos: PopularVideo[] }
  | { status: "error" };

export async function loadPopularVideos(): Promise<PopularVideosState> {
  const baseUrl = process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  if (!baseUrl) return { status: "error" };
  try {
    const response = await fetch(`${withWikiApiPrefix(baseUrl)}/videos/popular`, {
      headers: { accept: "application/json" },
      next: { revalidate: 60, tags: [publicWikiCacheTag] },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { status: "error" };
    const result = responseSchema.safeParse(await response.json());
    return result.success
      ? { status: "success", videos: result.data.videos }
      : { status: "error" };
  } catch {
    return { status: "error" };
  }
}
