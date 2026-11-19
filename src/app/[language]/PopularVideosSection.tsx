"use client";

import Image from "next/image";
import { HorizontalCarousel } from "@/components/HorizontalCarousel";
import Link from "next/link";
import { Play } from "lucide-react";
import { buildWikiPath, formatVideoDuration, getVideoThumbnailUrl } from "@kpool/wiki";
import {
  PlaybackOutlet,
  VideoPlaybackProvider,
  usePlaybackOwner,
  useVideoPlayback,
} from "@/components/VideoPlayback/VideoPlaybackProvider";
import type { PlaybackStore } from "@/components/VideoPlayback/playbackStore";
import type { PopularVideo, PopularVideosState } from "@/gateways/wiki/popularVideos";
import type { Locale } from "@/i18n/locales";
import { popularVideosCopy } from "@/i18n/popularVideos";
import { useState } from "react";

function VideoCard({ video, locale, onPlay }: {
  video: PopularVideo;
  locale: Locale;
  onPlay: () => void;
}) {
  const t = popularVideosCopy[locale];
  const [imageFailed, setImageFailed] = useState(false);
  const thumbnail = getVideoThumbnailUrl(video.thumbnailUrl) ??
    (video.provider === "youtube" ? `https://i.ytimg.com/vi/${video.externalVideoId}/mqdefault.jpg` : null);
  const duration = formatVideoDuration(video.durationSeconds);

  return (
    <li className="w-[78vw] max-w-80 shrink-0 snap-start overflow-hidden rounded-2xl border border-stroke-subtle bg-surface-raised sm:w-72">
      <button
        type="button"
        onClick={onPlay}
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
      </button>
      <h3 className="p-4 text-base font-semibold leading-6">
        <Link
          href={`${buildWikiPath(video.language, video.slug)}?tab=video`}
          className="line-clamp-2 min-h-12 hover:text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          {video.title}
        </Link>
      </h3>
    </li>
  );
}

function ConnectedVideoCards({ videos, locale, store }: {
  videos: PopularVideo[];
  locale: Locale;
  store: PlaybackStore;
}) {
  const owner = `home-popular-videos:${locale}`;
  usePlaybackOwner(store, owner);
  return (
    <HorizontalCarousel
      title={popularVideosCopy[locale].title}
      previousLabel={popularVideosCopy[locale].previous}
      nextLabel={popularVideosCopy[locale].next}
      beforeItems={<PlaybackOutlet owner={owner} />}
    >
      {videos.map((video) => (
        <VideoCard
          key={video.videoLinkIdentifier}
          video={video}
          locale={locale}
          onPlay={() => store.getState().start(owner, [{
            identifier: video.videoLinkIdentifier,
            videoId: video.externalVideoId,
            provider: video.provider,
            title: video.title,
          }], "single")}
        />
      ))}
    </HorizontalCarousel>
  );
}

function VideoCards({ videos, locale }: { videos: PopularVideo[]; locale: Locale }) {
  const playback = useVideoPlayback();
  return playback ? (
    <ConnectedVideoCards videos={videos} locale={locale} store={playback.store} />
  ) : (
    <VideoPlaybackProvider><VideoCards videos={videos} locale={locale} /></VideoPlaybackProvider>
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
