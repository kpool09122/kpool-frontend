"use client";

import Image from "next/image";
import { LoopIcon, PlayIcon, ShuffleIcon, StopIcon } from "@radix-ui/react-icons";
import { YouTubeQueuePlayer } from "./YouTubeQueuePlayer";
import {
  advancePlayback,
  playbackOrder,
  type PlaybackQueue,
} from "./playbackQueue";
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
    | PlaybackQueue
    | { mode: "individual"; identifier: string }
    | null
  >(null);
  const [loop, setLoop] = useState(false);
  const [random, setRandom] = useState(false);
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
    playback?.mode === "continuous"
      ? queue[playback.order[playback.position]]
      : undefined;
  const requested =
    playback?.mode === "continuous" ? queue[playback.playerIndex] : undefined;
  const playbackAtVideo = (current: PlaybackQueue, videoId?: string) => {
    if (queue[current.order[current.position]].videoId === videoId) return current;
    const position = current.order.findIndex(
      (index) => queue[index].videoId === videoId,
    );
    return position >= 0 ? { ...current, position } : current;
  };
  const next = (failed = false, videoId?: string) => {
    if (playback?.mode === "continuous") {
      setPlayback(
        advancePlayback(playbackAtVideo(playback, videoId), {
          loop,
          random,
          failed,
        }),
      );
    }
  };
  const toggleRandom = () => {
    const enabled = !random;
    setRandom(enabled);
    if (playback?.mode === "continuous") {
      const remaining = playback.order.slice(playback.position + 1);
      setPlayback({
        ...playback,
        order: [
          ...playback.order.slice(0, playback.position + 1),
          ...playbackOrder(remaining.sort((a, b) => a - b), enabled),
        ],
      });
    }
  };
  const toggleClassName =
    "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary aria-pressed:text-brand-primary aria-pressed:after:absolute aria-pressed:after:bottom-1 aria-pressed:after:h-1 aria-pressed:after:w-1 aria-pressed:after:rounded-full aria-pressed:after:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-5">
        <button
          type="button"
          aria-label={t.random}
          title={t.random}
          aria-pressed={random}
          disabled={!queue.length}
          onClick={toggleRandom}
          className={toggleClassName}
        >
          <ShuffleIcon aria-hidden="true" className="h-6 w-6" />
        </button>
        <button
          type="button"
          ref={startButton}
          aria-pressed={playback?.mode === "continuous"}
          disabled={!queue.length || playback?.mode === "continuous"}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary aria-pressed:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:aria-pressed:opacity-100"
          onClick={() => {
            setNotice(null);
            const order = playbackOrder(
              queue.map((_, index) => index),
              random,
            );
            setPlayback({
              mode: "continuous",
              order,
              position: 0,
              playerIndex: order[0],
              sequence: 0,
              failed: [],
            });
          }}
        >
          <PlayIcon aria-hidden="true" className="h-6 w-6" />
          {t.start}
        </button>
        {playback ? (
          <button
            type="button"
            aria-label={t.stop}
            title={t.stop}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary"
            onClick={() => {
              restoreFocus.current = true;
              setPlayback(null);
              setNotice(null);
            }}
          >
            <StopIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label={t.loop}
          title={t.loop}
          aria-pressed={loop}
          disabled={!queue.length}
          onClick={() => setLoop((current) => !current)}
          className={toggleClassName}
        >
          <LoopIcon aria-hidden="true" className="h-6 w-6" />
        </button>
      </div>
      {notice ? <p role="status">{notice}</p> : null}
      {active && requested ? (
        <section aria-label={t.nowPlaying} className="space-y-3">
          <p role="status" className="break-words font-semibold">
            {t.nowPlaying}: {active.video.title} (
            {playback?.mode === "continuous" ? playback.position + 1 : 0}/
            {playback?.mode === "continuous"
              ? playback.order.length
              : queue.length})
          </p>
          <YouTubeQueuePlayer
            key={playback?.mode === "continuous" ? playback.sequence : 0}
            videoId={requested.videoId}
            title={active.video.title}
            onVideoChange={(videoId) => {
              if (playback?.mode !== "continuous") return;
              const synchronized = playbackAtVideo(playback, videoId);
              if (synchronized.position !== playback.position) {
                setPlayback(synchronized);
              } else if (active.videoId !== videoId) {
                setNotice(t.outsideQueue);
                setPlayback(null);
              }
            }}
            onEnded={(videoId) => next(false, videoId)}
            onError={() => {
              setNotice(`${t.skipped}: ${active.video.title}`);
              next(true);
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
