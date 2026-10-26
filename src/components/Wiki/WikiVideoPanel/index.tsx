"use client";

import Image from "next/image";
import { WikiVideoLikeControl, WikiVideoPlaybackLike } from "./WikiVideoLikeControl";
import { useWikiVideoLikes } from "@/gateways/wiki/useWikiVideoLikes";
import { YouTubeQueueControls } from "@/components/YouTubePlayback/YouTubeQueueControls";
import { nextLoopMode, type LoopMode } from "@/components/YouTubePlayback/playbackQueue";
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
  likeControl,
  player,
  current,
  onPlay,
}: {
  video: WikiVideo;
  player?: React.ReactNode;
  current: boolean;
  onPlay: () => void;
  deleteControl?: React.ReactNode;
  likeControl?: React.ReactNode;
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
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-stroke-subtle bg-surface-base p-4"
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
      <div className="mt-auto flex items-center justify-end gap-3">
        {!videoId ? <p role="status" className="mr-auto">{t.unavailable}</p> : null}
        {likeControl}
      </div>
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
  const likes = useWikiVideoLikes(identity, query.data?.videos ?? [], access.sessionKey);
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
      identity={identity}
      videos={query.data.videos}
      emptyMessage={Object.keys(filter).length ? t.filter.empty : t.empty}
      access={access}
      likes={likes}
      onDeleted={onDeleted}
    />
  );
}

function VideoPlaybackList({
  identity,
  videos,
  emptyMessage,
  access,
  likes,
  onDeleted,
}: {
  identity: WikiVideoIdentity;
  videos: WikiVideo[];
  emptyMessage: string;
  access: ReturnType<typeof useWikiVideoDeleteAccess>;
  likes: ReturnType<typeof useWikiVideoLikes>;
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
  const [preferredLoop, setPreferredLoop] = useState<LoopMode>("off");
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
  const setLoop = (mode: LoopMode) => {
    setPreferredLoop(mode);
    if (playback) store.getState().setLoop(mode);
  };
  const toggleRandom = () => {
    setPreferredRandom(!random);
    if (playback) store.getState().setRandom(!random);
  };
  return (
    <div className="space-y-5">
      <YouTubeQueueControls
        labels={t}
        empty={!queue.length}
        playing={playback?.kind === "queue"}
        floating={!!playback && floating}
        random={random}
        loop={loop}
        startRef={startButton}
        onToggleRandom={toggleRandom}
        onToggleLoop={() => setLoop(nextLoopMode(loop))}
        onStart={() => {
          store.getState().start(owner, queue.map(({ video, videoId }) => ({
            identifier: video.videoLinkIdentifier, videoId, title: video.title,
            controls: <WikiVideoPlaybackLike key={video.videoLinkIdentifier} identity={identity} video={video} />,
          })), "queue", loop, random);
        }}
        onStop={playback ? () => {
          restoreFocus.current = true;
          store.getState().stop();
        } : undefined}
      />
      {notice ? <p role="status">{notice}</p> : null}
      {playback?.kind === "queue" ? <PlaybackOutlet owner={owner} /> : null}
      {likes.loading ? <p role="status">{dictionary.wiki.videos.likes.loading}</p> : null}
      {likes.error ? <div role="alert"><p>{dictionary.wiki.videos.likes.loadError}</p><button type="button" className="min-h-11 underline" onClick={likes.retry}>{dictionary.wiki.videos.likes.retry}</button></div> : null}
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
                controls: <WikiVideoPlaybackLike key={video.videoLinkIdentifier} identity={identity} video={video} />,
              }], "single");
            }}
            likeControl={<WikiVideoLikeControl video={video} likes={likes} />}
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
