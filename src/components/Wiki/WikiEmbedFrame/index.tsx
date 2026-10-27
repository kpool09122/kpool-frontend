"use client";

import { getYouTubeVideoId, getTikTokVideoId, type WikiEmbedBlock } from "@kpool/wiki";
import { useVideoPlayback } from "@/components/VideoPlayback/VideoPlaybackProvider";
import { SharedVideoEmbed } from "@/components/VideoPlayback/SharedVideoEmbed";

const frameSurfaceStyle = {
  backgroundColor: "var(--wiki-card-background-muted, var(--surface-base))",
  borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
};

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
  const url = parseUrl(value);
  const path = url ? url.pathname : value;

  return path.replace(/^\/?embed\//, "").replace(/^\//, "");
}

function getXPostId(value: string): string {
  const url = parseUrl(value);

  if (!url) {
    return value;
  }

  return getLastPathPart(url.pathname);
}

function getEmbedFrame(block: WikiEmbedBlock): {
  allow: string;
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

      return {
        allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
        src: `https://open.spotify.com/embed/${spotifyPath}`,
        title: `Spotify embed${titleCaption}`,
      };
    }
    case "x": {
      const postId = encodeURIComponent(getXPostId(block.embedId));

      return {
        allow: "clipboard-write; encrypted-media",
        src: `https://platform.twitter.com/embed/Tweet.html?id=${postId}`,
        title: `X embed${titleCaption}`,
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

export function WikiEmbedFrame({ block }: { block: WikiEmbedBlock }) {
  const playback = useVideoPlayback();
  const frame = getEmbedFrame(block);
  const videoId = block.provider === "youtube" ? getYouTubeVideoId(block.embedId) : block.provider === "tiktok" ? getTikTokVideoId(block.embedId) : null;

  return (
    <figure className="overflow-hidden rounded-2xl border border-stroke-subtle" style={frameSurfaceStyle}>
      {playback && videoId ? (
        <SharedVideoEmbed provider={block.provider === "tiktok" ? "tiktok" : "youtube"} videoId={videoId} title={block.caption || (block.provider === "tiktok" ? "TikTok" : "YouTube")} identifier={block.blockIdentifier} />
      ) : <div className="aspect-video w-full bg-surface-base">
        <iframe
          allow={frame.allow}
          allowFullScreen
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={frame.src}
          title={frame.title}
        />
      </div>}
      {block.caption ? (
        <figcaption className="border-t border-stroke-subtle px-4 py-3 text-base text-text-muted">
          {block.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
