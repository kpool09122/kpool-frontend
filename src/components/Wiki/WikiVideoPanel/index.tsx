"use client";

import Image from "next/image";
import { YouTubeQueuePlayer } from "./YouTubeQueuePlayer";
import { useEffect, useRef, useState } from "react";
import { useWikiVideoDeleteAccess } from "@/gateways/wiki/useWikiVideoDeleteAccess";
import { WikiVideoDeleteButton } from "./WikiVideoDeleteButton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatVideoDuration,
  getYouTubeVideoId,
  getYouTubeThumbnailUrl,
} from "@kpool/wiki";
import {
  fetchWikiVideos,
  type WikiVideo,
  type WikiVideoIdentity,
} from "@/gateways/wiki/wikiVideos";
import { useI18n } from "@/i18n/I18nProvider";
import { WikiEmbedFrame } from "../WikiEmbedFrame";
import { WikiVideoCreateEntry } from "../WikiVideoCreateForm/WikiVideoCreateEntry";
import type { WikiVideoDurationFilter as DurationFilter } from "@/gateways/wiki/wikiVideoFilters";
import { WikiVideoDurationFilter } from "./WikiVideoDurationFilter";
import { SocialLinkIcon } from "../socialLinks";

function VideoCard({
  video,
  deleteControl,
  playing,
  current,
  onPlay,
}: {
  video: WikiVideo;
  playing: boolean;
  current: boolean;
  onPlay: () => void;
  deleteControl?: React.ReactNode;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos;
  const [imageFailed, setImageFailed] = useState(false);
  const videoId = getYouTubeVideoId(video.url);
  const thumbnail = getYouTubeThumbnailUrl(video.thumbnailUrl);
  const duration = formatVideoDuration(video.durationSeconds);
  return (
    <li
      aria-current={current ? "true" : undefined}
      className="min-w-0 space-y-3 rounded-2xl border border-stroke-subtle bg-surface-base p-4"
    >
      {current ? (
        <p className="font-semibold text-brand-primary">
          {t.continuous.nowPlaying}
        </p>
      ) : null}
      <div className="flex items-start gap-2">
        <h2 className="flex min-w-0 flex-1 items-start gap-2 text-lg font-semibold">
          {videoId ? (
            <span className="pt-1">
              <SocialLinkIcon
                url={`https://www.youtube.com/watch?v=${videoId}`}
              />
            </span>
          ) : null}
          <span className="min-w-0 break-words">{video.title}</span>
        </h2>
        {deleteControl}
      </div>
      {playing && videoId ? (
        <WikiEmbedFrame
          block={{
            blockType: "embed",
            blockIdentifier: video.videoLinkIdentifier,
            displayOrder: 0,
            provider: "youtube",
            embedId: videoId,
            caption: video.title,
          }}
        />
      ) : (
        <button
          type="button"
          disabled={!videoId}
          aria-label={`${t.play}: ${video.title}`}
          onClick={onPlay}
          className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed"
        >
          {thumbnail && !imageFailed ? (
            <Image
              src={thumbnail}
              alt={video.title}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="p-4 text-text-muted">
              {t.thumbnailUnavailable}
            </span>
          )}
          {videoId ? (
            <span
              aria-hidden="true"
              className="absolute rounded-full bg-black/75 px-5 py-3 text-2xl text-white"
            >
              ▶
            </span>
          ) : null}
          {duration !== null ? (
            <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white">
              {duration}
            </span>
          ) : null}
        </button>
      )}
      {videoId ? (
        <a
          className="inline-block underline"
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.openYouTube}
        </a>
      ) : (
        <p role="status">{t.unavailable}</p>
      )}
    </li>
  );
}

export function WikiVideoPanel({
  wikiIdentifier,
  ...identity
}: WikiVideoIdentity & { wikiIdentifier?: string }) {
  const queryClient = useQueryClient();
  return (
    <>
      {wikiIdentifier ? (
        <WikiVideoCreateEntry
          key={`${wikiIdentifier}:${identity.resourceType}`}
          wikiIdentifier={wikiIdentifier}
          resourceType={identity.resourceType}
          onCreated={() => {
            void queryClient.invalidateQueries({
              queryKey: [
                "public-wiki-videos",
                identity.language,
                identity.resourceType,
                identity.slug,
              ],
            });
          }}
        />
      ) : null}
      <VideoSearch
        key={`${identity.language}:${identity.resourceType}:${identity.slug}`}
        identity={identity}
      />
    </>
  );
}

function VideoSearch({ identity }: { identity: WikiVideoIdentity }) {
  const [{ filter, generation }, setSearch] = useState<{
    filter: DurationFilter;
    generation: number;
  }>({ filter: {}, generation: 0 });
  return (
    <>
      <WikiVideoDurationFilter
        onSearch={(filter) =>
          setSearch(({ generation }) => ({
            filter,
            generation: generation + 1,
          }))
        }
      />
      <VideoList key={generation} identity={identity} filter={filter} />
    </>
  );
}

function VideoList({
  identity,
  filter,
}: {
  identity: WikiVideoIdentity;
  filter: DurationFilter;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos;
  const queryClient = useQueryClient();
  const access = useWikiVideoDeleteAccess(identity.resourceType);
  const cacheKey = [
    "public-wiki-videos",
    identity.language,
    identity.resourceType,
    identity.slug,
  ];
  const onDeleted = (video: WikiVideo) => {
    queryClient.setQueriesData<{ videos: WikiVideo[] }>(
      { queryKey: cacheKey },
      (data) =>
        data
          ? {
              videos: data.videos.filter(
                (item) =>
                  item.videoLinkIdentifier !== video.videoLinkIdentifier,
              ),
            }
          : data,
    );
    void queryClient.invalidateQueries({
      queryKey: cacheKey,
      refetchType: "all",
    });
  };
  const query = useQuery({
    queryKey: [
      "public-wiki-videos",
      identity.language,
      identity.resourceType,
      identity.slug,
      filter,
    ],
    queryFn: () => fetchWikiVideos({ ...identity, ...filter }),
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
  if (query.isPending) return <p role="status">{t.loading}</p>;
  if (query.isError)
    return (
      <div role="alert">
        <p>{t.error}</p>
        <button
          type="button"
          className="mt-3 underline"
          onClick={() => void query.refetch()}
        >
          {t.retry}
        </button>
      </div>
    );
  // Reset the player synchronously when queue membership/order/URLs change.
  // Metadata-only refreshes retain the current queue position.
  return (
    <VideoPlaybackList
      key={JSON.stringify(
        query.data.videos.map((video) => [
          video.videoLinkIdentifier,
          video.url,
        ]),
      )}
      videos={query.data.videos}
      emptyMessage={Object.keys(filter).length ? t.filter.empty : t.empty}
      access={access}
      onDeleted={onDeleted}
    />
  );
}

function VideoPlaybackList({
  videos,
  emptyMessage,
  access,
  onDeleted,
}: {
  videos: WikiVideo[];
  emptyMessage: string;
  access: ReturnType<typeof useWikiVideoDeleteAccess>;
  onDeleted: (video: WikiVideo) => void;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.continuous;
  const queue = videos.flatMap((video) => {
    const videoId = getYouTubeVideoId(video.url);
    return videoId ? [{ video, videoId }] : [];
  });
  const [playback, setPlayback] = useState<
    | { mode: "continuous"; index: number }
    | { mode: "individual"; identifier: string }
    | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (restoreFocus.current && !playback) {
      restoreFocus.current = false;
      startButton.current?.focus();
    }
  }, [playback]);
  const active =
    playback?.mode === "continuous" ? queue[playback.index] : undefined;
  const next = () =>
    setPlayback((current) =>
      current?.mode === "continuous" && current.index + 1 < queue.length
        ? { mode: "continuous", index: current.index + 1 }
        : null,
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          ref={startButton}
          disabled={!queue.length || playback?.mode === "continuous"}
          className="rounded-lg bg-brand-primary px-4 py-2 font-semibold text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:opacity-50"
          onClick={() => {
            setNotice(null);
            setPlayback({ mode: "continuous", index: 0 });
          }}
        >
          {t.start}
        </button>
        {playback ? (
          <button
            type="button"
            className="rounded-lg border border-stroke-subtle px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-brand-primary"
            onClick={() => {
              restoreFocus.current = true;
              setPlayback(null);
              setNotice(null);
            }}
          >
            {t.stop}
          </button>
        ) : null}
      </div>
      {notice ? <p role="status">{notice}</p> : null}
      {active ? (
        <section aria-label={t.nowPlaying} className="space-y-3">
          <p role="status" className="break-words font-semibold">
            {t.nowPlaying}: {active.video.title} (
            {playback?.mode === "continuous" ? playback.index + 1 : 0}/
            {queue.length})
          </p>
          <YouTubeQueuePlayer
            key={active.video.videoLinkIdentifier}
            videoId={active.videoId}
            title={active.video.title}
            onEnded={next}
            onError={() => {
              setNotice(`${t.skipped}: ${active.video.title}`);
              next();
            }}
            onUnavailable={() => {
              setNotice(t.unavailable);
              setPlayback(null);
            }}
          />
        </section>
      ) : null}
      {!videos.length ? <p>{emptyMessage}</p> : null}
      <ul className="grid gap-5 sm:grid-cols-2">
        {videos.map((video) => (
          <VideoCard
            key={video.videoLinkIdentifier}
            video={video}
            playing={
              playback?.mode === "individual" &&
              playback.identifier === video.videoLinkIdentifier
            }
            current={
              active?.video.videoLinkIdentifier === video.videoLinkIdentifier
            }
            onPlay={() => {
              setNotice(null);
              setPlayback({
                mode: "individual",
                identifier: video.videoLinkIdentifier,
              });
            }}
            deleteControl={
              access.principalIdentifier &&
              ([
                "youtube_auto_view_count",
                "youtube_auto_like_count",
                "youtube_auto_recent_popular",
              ].includes(video.videoUsage) ||
                (video.creatorPrincipalIdentifier !== null &&
                  video.creatorPrincipalIdentifier ===
                    access.principalIdentifier)) ? (
                <WikiVideoDeleteButton
                  key={access.sessionKey}
                  video={video}
                  onDeleted={() => onDeleted(video)}
                />
              ) : undefined
            }
          />
        ))}
      </ul>
    </div>
  );
}
