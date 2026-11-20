"use client";

import Image from "next/image";
import { HorizontalCarousel } from "@/components/HorizontalCarousel";
import Link from "next/link";
import { Play } from "lucide-react";
import { buildWikiPath, formatVideoDuration, getVideoThumbnailUrl } from "@kpool/wiki";
import { YouTubePlayer } from "@/components/VideoPlayback/YouTubePlayer";
import { TikTokPlayer } from "@/components/VideoPlayback/TikTokPlayer";
import type { PopularVideo, PopularVideosState } from "@/gateways/wiki/popularVideos";
import type { Locale } from "@/i18n/locales";
import { popularVideosCopy } from "@/i18n/popularVideos";
import { useState } from "react";

function VideoCard({ video, locale, active, onPlay, onEnd }: {
  video: PopularVideo;
  locale: Locale;
  active: boolean;
  onPlay: () => void;
  onEnd: () => void;
}) {
  const t = popularVideosCopy[locale];
  const [imageFailed, setImageFailed] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const thumbnail = getVideoThumbnailUrl(video.thumbnailUrl) ??
    (video.provider === "youtube" ? `https://i.ytimg.com/vi/${video.externalVideoId}/mqdefault.jpg` : null);
  const duration = formatVideoDuration(video.durationSeconds);

  return (
    <article className="h-full overflow-hidden rounded-2xl border border-stroke-subtle bg-surface-raised">
      {active ? (
        <div className="aspect-video w-full overflow-hidden bg-black">
          {playbackFailed ? (
            <p role="status" className="flex h-full items-center justify-center p-4 text-sm text-white">{t.unavailable}</p>
          ) : video.provider === "youtube" ? (
            <YouTubePlayer
              videoId={video.externalVideoId}
              title={video.title}
              className="h-full w-full"
              onStateChange={({ state }) => { if (state === 0) onEnd(); }}
              onError={() => setPlaybackFailed(true)}
              onUnavailable={() => setPlaybackFailed(true)}
            />
          ) : (
            <TikTokPlayer
              videoId={video.externalVideoId}
              title={video.title}
              expanded
              advanceOnError={false}
              onEnded={onEnd}
              onError={() => setPlaybackFailed(true)}
            />
          )}
        </div>
      ) : <button
        type="button"
        onClick={() => { setPlaybackFailed(false); onPlay(); }}
        aria-label={`${t.play}: ${video.title}`}
        className="group relative flex aspect-video w-full items-center justify-center overflow-hidden bg-brand-primary/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary"
      >
        {thumbnail && !imageFailed ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 640px) 78vw, 288px"
            className="object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : null}
        <span aria-hidden="true" className="relative rounded-full bg-black/65 p-3 text-white transition group-hover:bg-black/85">
          <Play size={22} fill="currentColor" />
        </span>
        {duration !== null ? (
          <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs tabular-nums text-white">{duration}</span>
        ) : null}
      </button>}
      <h3 className="p-4 text-base font-semibold leading-6">
        <Link
          href={`${buildWikiPath(video.language, video.slug)}?tab=video`}
          className="block truncate hover:text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          {video.title}
        </Link>
      </h3>
    </article>
  );
}

function VideoCards({ videos, locale }: { videos: PopularVideo[]; locale: Locale }) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  return (
    <HorizontalCarousel
      title={popularVideosCopy[locale].title}
      paginationLabel={popularVideosCopy[locale].pagination}
      slideLabel={popularVideosCopy[locale].slide}
      autoPlay={activeVideo === null}
    >
      {videos.map((video) => (
        <VideoCard
          key={video.videoLinkIdentifier}
          video={video}
          locale={locale}
          active={activeVideo === video.videoLinkIdentifier}
          onPlay={() => setActiveVideo(video.videoLinkIdentifier)}
          onEnd={() => setActiveVideo((current) => current === video.videoLinkIdentifier ? null : current)}
        />
      ))}
    </HorizontalCarousel>
  );
}

export function PopularVideosSection({ locale, state }: { locale: Locale; state: PopularVideosState }) {
  const t = popularVideosCopy[locale];
  if (state.status === "success" && state.videos.length > 0) {
    return <VideoCards videos={state.videos} locale={locale} />;
  }
  return (
    <section aria-labelledby="popular-videos-heading" className="min-w-0 space-y-4">
      <div>
        <h2 id="popular-videos-heading" className="text-2xl font-semibold">{t.title}</h2>
      </div>
      <p className="rounded-2xl border border-stroke-subtle bg-surface-raised p-5 text-sm text-text-muted">
        {state.status === "error" ? t.error : t.empty}
      </p>
    </section>
  );
}
