"use client";

import Image from "next/image";
import { LoopIcon, PlayIcon, ShuffleIcon, StopIcon } from "@radix-ui/react-icons";
import { useEffect, useId, useRef, useState } from "react";
import { useStore } from "zustand";
import {
  PlaybackOutlet,
  YouTubePlaybackProvider,
  usePlaybackOwner,
  useYouTubePlayback,
} from "@/components/YouTubePlayback/YouTubePlaybackProvider";
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
import { WikiVideoCreateEntry } from "../WikiVideoCreateForm/WikiVideoCreateEntry";
import type { WikiVideoDurationFilter as DurationFilter } from "@/gateways/wiki/wikiVideoFilters";
import { WikiVideoDurationFilter } from "./WikiVideoDurationFilter";
import { SocialLinkIcon } from "../socialLinks";

function VideoCard({
  video,
  deleteControl,
  player,
  current,
  onPlay,
}: {
  video: WikiVideo;
  player?: React.ReactNode;
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
      {player ? (
        player
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

export function WikiVideoPanel(props: WikiVideoIdentity & { wikiIdentifier?: string }) {
  const context = useYouTubePlayback();
  return context ? <WikiVideoPanelContent {...props} /> : (
    <YouTubePlaybackProvider><WikiVideoPanelContent {...props} /></YouTubePlaybackProvider>
  );
}

function WikiVideoPanelContent({
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
  const { store } = useYouTubePlayback()!;
  const owner = useId();
  usePlaybackOwner(store, owner);
  const session = useStore(store, (state) => state.session);
  const floating = useStore(store, (state) => state.floating);
  const sharedNotice = useStore(store, (state) => state.notice);
  const playback = session?.owner === owner ? session : null;
  const [preferredLoop, setPreferredLoop] = useState(false);
  const [preferredRandom, setPreferredRandom] = useState(false);
  const loop = playback?.loop ?? preferredLoop;
  const random = playback?.random ?? preferredRandom;
  const notice = sharedNotice?.owner === owner && !sharedNotice.floating
    ? `${t[sharedNotice.kind]}${sharedNotice.title ? `: ${sharedNotice.title}` : ""}` : null;
  const startButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (restoreFocus.current && !playback) {
      restoreFocus.current = false;
      startButton.current?.focus();
    }
  }, [playback]);
  const active = playback?.tracks[playback.queue.order[playback.queue.position]];
  const setLoop = (enabled: boolean) => {
    setPreferredLoop(enabled);
    if (playback) store.getState().setLoop(enabled);
  };
  const toggleRandom = () => {
    setPreferredRandom(!random);
    if (playback) store.getState().setRandom(!random);
  };
  const toggleClassName =
    "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary aria-pressed:text-brand-primary aria-pressed:after:absolute aria-pressed:after:bottom-1 aria-pressed:after:h-1 aria-pressed:after:w-1 aria-pressed:after:rounded-full aria-pressed:after:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-5">
        {!(playback && floating) ? (
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
        ) : null}
        <button
          type="button"
          ref={startButton}
          aria-pressed={playback?.kind === "queue"}
          disabled={!queue.length || playback?.kind === "queue"}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary aria-pressed:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:aria-pressed:opacity-100"
          onClick={() => {
            store.getState().start(owner, queue.map(({ video, videoId }) => ({
              identifier: video.videoLinkIdentifier, videoId, title: video.title,
            })), "queue", loop, random);
          }}
        >
          <PlayIcon aria-hidden="true" className="h-6 w-6" />
          {t.start}
        </button>
        {playback && !floating ? (
          <button
            type="button"
            aria-label={t.stop}
            title={t.stop}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary"
            onClick={() => {
              restoreFocus.current = true;
              store.getState().stop();
            }}
          >
            <StopIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        ) : null}
        {!(playback && floating) ? (
          <button
            type="button"
            aria-label={t.loop}
            title={t.loop}
            aria-pressed={loop}
            disabled={!queue.length}
            onClick={() => setLoop(!loop)}
            className={toggleClassName}
          >
            <LoopIcon aria-hidden="true" className="h-6 w-6" />
          </button>
        ) : null}
      </div>
      {notice ? <p role="status">{notice}</p> : null}
      {playback?.kind === "queue" ? <PlaybackOutlet owner={owner} /> : null}
      {!videos.length ? <p>{emptyMessage}</p> : null}
      <ul className="grid gap-5 sm:grid-cols-2">
        {videos.map((video) => (
          <VideoCard
            key={video.videoLinkIdentifier}
            video={video}
            player={playback?.kind === "single" && active?.identifier === video.videoLinkIdentifier
              ? <PlaybackOutlet owner={owner} /> : undefined}
            current={active?.identifier === video.videoLinkIdentifier}
            onPlay={() => {
              const videoId = getYouTubeVideoId(video.url);
              if (videoId) store.getState().start(owner, [{
                identifier: video.videoLinkIdentifier, videoId, title: video.title,
              }], "single");
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
