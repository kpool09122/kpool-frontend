"use client";

import { getYouTubeVideoId, getTikTokVideoId, parseWikiEmbedUrl, type WikiEmbedBlock } from "@kpool/wiki";
import type { ReactNode } from "react";
import { useVideoPlayback } from "@/components/VideoPlayback/VideoPlaybackProvider";
import { SharedVideoEmbed } from "@/components/VideoPlayback/SharedVideoEmbed";

import { youtubeEmbedClassName } from "../styles";
import { XPostEmbed } from "./XPostEmbed";

function parseUrl(value: string): URL | null {
  return URL.canParse(value) ? new URL(value) : null;
}

function getLastPathPart(value: string): string {
  return value.split("/").filter(Boolean).at(-1) ?? value;
}

function getYoutubeVideoId(value: string): string {
  const url = parseUrl(value);

  if (!url) {
    return value;
  }

  return (
    url.searchParams.get("v") ??
    getLastPathPart(url.pathname)
  );
}

function getSpotifyPath(value: string): string {
  const embed = parseWikiEmbedUrl(value);
  if (embed?.provider === "spotify") return embed.embedId;

  const url = parseUrl(value);
  const path = url ? url.pathname : value;

  return path.replace(/^\/?embed\//, "").replace(/^\//, "");
}

function getXPostId(value: string): string | null {
  const url = parseUrl(value);
  const id = url ? getLastPathPart(url.pathname) : value.trim();
  return /^\d+$/.test(id) ? id : null;
}

function getEmbedFrame(block: WikiEmbedBlock & { provider: Exclude<WikiEmbedBlock["provider"], "x"> }): {
  allow: string;
  height?: number;
  src: string;
  title: string;
} {
  const titleCaption = block.caption ? `: ${block.caption}` : "";

  switch (block.provider) {
    case "youtube": {
      const videoId = encodeURIComponent(getYoutubeVideoId(block.embedId));

      return {
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        src: `https://www.youtube-nocookie.com/embed/${videoId}`,
        title: `YouTube embed${titleCaption}`,
      };
    }
    case "spotify": {
      const spotifyPath = getSpotifyPath(block.embedId);
      const contentType = spotifyPath.split("/")[0];

      return {
        allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
        height: ["track", "episode", "show"].includes(contentType) ? 152 : 352,
        src: `https://open.spotify.com/embed/${spotifyPath}`,
        title: `Spotify embed${titleCaption}`,
      };
    }
    case "tiktok": {
      const videoId = encodeURIComponent(getTikTokVideoId(block.embedId) ?? "");

      return {
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        src: `https://www.tiktok.com/player/v1/${videoId}?loop=0`,
        title: `TikTok embed${titleCaption}`,
      };
    }
  }
}

function WikiEmbedFigure({ children, caption, className }: {
  children: ReactNode;
  caption: WikiEmbedBlock["caption"];
  className?: string;
}) {
  return (
    <figure className={className}>
      {children}
      {caption && <figcaption className="mt-2 text-sm text-text-muted">{caption}</figcaption>}
    </figure>
  );
}

export function WikiEmbedFrame({ block }: { block: WikiEmbedBlock }) {
  const playback = useVideoPlayback();
  if (block.provider === "x") {
    const postId = getXPostId(block.embedId);
    if (!postId) return null;

    return (
      <WikiEmbedFigure caption={block.caption} className="mr-auto w-full max-w-[480px]">
        <XPostEmbed key={postId} postId={postId} />
      </WikiEmbedFigure>
    );
  }

  const frame = getEmbedFrame({ ...block, provider: block.provider });
  const videoId = block.provider === "youtube" ? getYouTubeVideoId(block.embedId) : block.provider === "tiktok" ? getTikTokVideoId(block.embedId) : null;
  const sizingClassName = block.provider === "youtube" ? youtubeEmbedClassName : undefined;

  return (
    <WikiEmbedFigure caption={block.caption} className={sizingClassName}>
      {playback && videoId ? (
        <SharedVideoEmbed provider={block.provider === "tiktok" ? "tiktok" : "youtube"} videoId={videoId} title={block.caption || (block.provider === "tiktok" ? "TikTok" : "YouTube")} identifier={block.blockIdentifier} />
      ) : <div className={frame.height ? "w-full" : "aspect-video w-full"} style={frame.height ? { height: frame.height } : undefined}>
        <iframe
          allow={frame.allow}
          allowFullScreen
          className="block h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={frame.src}
          title={frame.title}
        />
      </div>}
    </WikiEmbedFigure>
  );
}
