import { isSafeWikiImageUrl } from "./wikiImageModel";

const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;

export type VideoProvider = "youtube" | "tiktok";
export const isVideoId = (provider: string, id: string): boolean =>
  provider === "youtube" ? videoIdPattern.test(id) : provider === "tiktok" && /^[1-9][0-9]{14,19}$/.test(id);
export const getTikTokVideoId = (value: string): string | null => {
  if (isVideoId("tiktok", value)) return value;
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !["www.tiktok.com", "tiktok.com"].includes(url.hostname)) return null;
  const id = url.pathname.match(/^\/@[^/]+\/video\/([1-9][0-9]{14,19})\/?$/)?.[1];
  return id ?? null;
};
export const normalizeVideoUrl = (value: string): string | null => {
  const trimmed = value.trim();
  const youtube = normalizeYouTubeVideoUrl(trimmed);
  if (youtube) return youtube;
  if (!URL.canParse(trimmed)) return null;
  const url = new URL(trimmed);
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (getTikTokVideoId(trimmed) || (["vm.tiktok.com", "vt.tiktok.com"].includes(url.hostname) && /^\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname))) return url.href;
  return null;
};
export const getVideoThumbnailUrl = (value: string | null): string | null => {
  if (!value || !URL.canParse(value)) return null;
  const url = new URL(value);
  if (url.username || url.password) return null;
  const ownHost = url.hostname === "images.k-pool.app" || ["localhost", "127.0.0.1"].includes(url.hostname);
  return getYouTubeThumbnailUrl(value) ?? (ownHost && isSafeWikiImageUrl(value) ? value : null);
};

export const formatVideoDuration = (seconds: number | null): string | null => {
  if (seconds === null || !Number.isSafeInteger(seconds) || seconds < 0)
    return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${minutes}:${remainder}`;
};

export const getYouTubeVideoId = (value: string): string | null => {
  if (videoIdPattern.test(value)) return value;
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    return null;
  let id: string | null = null;
  if (url.hostname === "youtu.be" && /^\/[^/]+\/?$/.test(url.pathname)) {
    id = url.pathname.split("/")[1];
  } else if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "www.youtube-nocookie.com",
      "youtube-nocookie.com",
    ].includes(url.hostname)
  ) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else
      id =
        url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1] ??
        null;
  }
  return id && videoIdPattern.test(id) ? id : null;
};

export const normalizeYouTubeVideoUrl = (value: string): string | null => {
  const id = getYouTubeVideoId(value.trim());
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
};

export const getYouTubeThumbnailUrl = (value: string | null): string | null => {
  if (!value || !URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    ["i.ytimg.com", "img.youtube.com"].includes(url.hostname)
    ? url.href
    : null;
};
