import type { WikiEmbedBlock } from "./types/wiki";
import { getTikTokVideoId, getYouTubeVideoId, isVideoId } from "./wikiVideoModel";

type WikiEmbedTarget = Pick<WikiEmbedBlock, "provider" | "embedId">;

const spotifyPathPattern = /^(track|album|artist|playlist|show|episode)\/[a-zA-Z0-9]+$/;
const xPostIdPattern = /^\d+$/;

export const newWikiEmbedId = "new-embed-id";

export function parseWikiEmbedUrl(value: string): WikiEmbedTarget | null {
  const input = value.trim();
  if (!URL.canParse(input)) return null;
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;

  const youtubeId = getYouTubeVideoId(url.href);
  if (youtubeId) return { provider: "youtube", embedId: youtubeId };

  const tiktokId = getTikTokVideoId(url.href);
  if (tiktokId) return { provider: "tiktok", embedId: tiktokId };

  switch (url.hostname) {
    case "www.tiktok.com":
    case "tiktok.com": {
      const id = url.pathname.match(/^\/(?:player\/v1|embed\/v2)\/(\d+)\/?$/)?.[1];
      return id && isVideoId("tiktok", id) ? { provider: "tiktok", embedId: id } : null;
    }
    case "open.spotify.com": {
      const path = url.pathname.replace(/^\/(?:intl-[a-z-]+\/)?(?:embed\/)?/i, "").replace(/\/$/, "");
      return spotifyPathPattern.test(path) ? { provider: "spotify", embedId: path } : null;
    }
    case "x.com":
    case "www.x.com":
    case "twitter.com":
    case "www.twitter.com":
    case "mobile.twitter.com": {
      const id = url.pathname.match(/^\/(?:[a-zA-Z0-9_]+|i\/web)\/status\/(\d+)\/?$/)?.[1];
      return id ? { provider: "x", embedId: id } : null;
    }
    default:
      return null;
  }
}

export function getWikiEmbedUrlInputValue({ provider, embedId }: WikiEmbedTarget): string {
  if (embedId === newWikiEmbedId) return "";
  if (parseWikiEmbedUrl(embedId)?.provider === provider) return embedId;

  switch (provider) {
    case "youtube":
      return isVideoId(provider, embedId) ? `https://www.youtube.com/watch?v=${embedId}` : embedId;
    case "tiktok":
      return isVideoId(provider, embedId) ? `https://www.tiktok.com/player/v1/${embedId}` : embedId;
    case "spotify": {
      const path = embedId.replace(/^\/?(?:embed\/)?/, "");
      return spotifyPathPattern.test(path) ? `https://open.spotify.com/${path}` : embedId;
    }
    case "x":
      return xPostIdPattern.test(embedId) ? `https://x.com/i/web/status/${embedId}` : embedId;
  }
}
