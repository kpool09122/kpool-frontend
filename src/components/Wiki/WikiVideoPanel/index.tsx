"use client";

import { WikiVideoWatchRequestControl } from "./WikiVideoWatchRequestControl";
import { useWikiVideoWatchRequests } from "@/gateways/wiki/useWikiVideoWatchRequests";
import Image from "next/image";
import { WikiVideoLikeControl, WikiVideoPlaybackLike } from "./WikiVideoLikeControl";
import { useWikiVideoLikes } from "@/gateways/wiki/useWikiVideoLikes";
import { VideoQueueControls } from "@/components/VideoPlayback/VideoQueueControls";
import { nextLoopMode, type LoopMode } from "@/components/VideoPlayback/playbackQueue";
import { useEffect, useId, useRef, useState } from "react";
import { useStore } from "zustand";
import {
  PlaybackOutlet,
  VideoPlaybackProvider,
  usePlaybackOwner,
  useVideoPlayback,
} from "@/components/VideoPlayback/VideoPlaybackProvider";
import { useWikiVideoDeleteAccess } from "@/gateways/wiki/useWikiVideoDeleteAccess";
import { WikiVideoDeleteButton } from "./WikiVideoDeleteButton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatVideoDuration,
  isVideoId,
  getVideoThumbnailUrl,
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
  watchControl,
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
  watchControl?: React.ReactNode;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos;
  const [imageFailed, setImageFailed] = useState(false);
  const videoId = isVideoId(video.provider, video.externalVideoId) ? video.externalVideoId : null;
  const thumbnail = getVideoThumbnailUrl(video.thumbnailUrl);
  const duration = formatVideoDuration(video.durationSeconds);
  return (
    <li
      aria-current={current ? "true" : undefined}
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-stroke-subtle bg-surface-base p-4"
    >
      {!player ? (
        <div className="flex items-start gap-2">
          <h2 className="flex min-w-0 flex-1 items-start gap-2 text-lg font-semibold">
            {videoId ? (
              <span className="pt-1">
                <SocialLinkIcon
                  url={video.provider === "tiktok" ? `https://www.tiktok.com/@_/video/${videoId}` : `https://www.youtube.com/watch?v=${videoId}`}
                />
              </span>
            ) : null}
            <span className="min-w-0 break-words">{video.title}</span>
          </h2>
          {deleteControl}
        </div>
      ) : null}
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
        {watchControl}
      </div>
    </li>
  );
}

type WikiVideoPanelProps = WikiVideoIdentity & {
  wikiIdentifier?: string;
  wikiTitle: string;
};

export function WikiVideoPanel(props: WikiVideoPanelProps) {
  const context = useVideoPlayback();
  return context ? <WikiVideoPanelContent {...props} /> : (
    <VideoPlaybackProvider><WikiVideoPanelContent {...props} /></VideoPlaybackProvider>
  );
}

function WikiVideoPanelContent({
  wikiIdentifier,
  wikiTitle,
  ...identity
}: WikiVideoPanelProps) {
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
        wikiTitle={wikiTitle}
      />
    </>
  );
}

function VideoSearch({ identity, wikiTitle }: { identity: WikiVideoIdentity; wikiTitle: string }) {
  const [{ filter, generation }, setSearch] = useState<{
    filter: DurationFilter;
    generation: number;
  }>({ filter: {}, generation: 0 });
  return (
    <>
      <WikiVideoDurationFilter
        wikiTitle={wikiTitle}
        onSearch={(filter) =>
          setSearch(({ generation }) => ({
            filter,
            generation: generation + 1,
          }))
        }
      />
      <VideoList key={generation} identity={identity} wikiTitle={wikiTitle} filter={filter} />
    </>
  );
}

function VideoList({
  identity,
  wikiTitle,
  filter,
}: {
  identity: WikiVideoIdentity;
  wikiTitle: string;
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
  const watch = useWikiVideoWatchRequests(identity, query.data?.videos ?? [], access.sessionKey);
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
      wikiTitle={wikiTitle}
      videos={query.data.videos}
      emptyMessage={Object.keys(filter).length ? t.filter.empty : t.empty}
      access={access}
      likes={likes}
      watch={watch}
      onDeleted={onDeleted}
    />
  );
}

function VideoPlaybackList({
  identity,
  wikiTitle,
  videos,
  emptyMessage,
  access,
  likes,
  watch,
  onDeleted,
}: {
  identity: WikiVideoIdentity;
  wikiTitle: string;
  videos: WikiVideo[];
  emptyMessage: string;
  access: ReturnType<typeof useWikiVideoDeleteAccess>;
  likes: ReturnType<typeof useWikiVideoLikes>;
  watch: ReturnType<typeof useWikiVideoWatchRequests>;
  onDeleted: (video: WikiVideo) => void;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.continuous;
  const queue = videos.flatMap((video) => {
    const videoId = isVideoId(video.provider, video.externalVideoId) ? video.externalVideoId : null;
    return videoId ? [{ video, videoId }] : [];
  });
  const { store } = useVideoPlayback()!;
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
      <VideoQueueControls
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
            identifier: video.videoLinkIdentifier, videoId, provider: video.provider, title: video.title,
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
      {watch.loading ? <p role="status">{dictionary.wiki.videos.watchRequests.loading}</p> : null}
      {watch.error ? <div role="alert"><p>{dictionary.wiki.videos.watchRequests.loadError}</p><button type="button" className="min-h-11 underline" onClick={watch.retry}>{dictionary.wiki.videos.watchRequests.retry}</button></div> : null}
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
              const videoId = isVideoId(video.provider, video.externalVideoId) ? video.externalVideoId : null;
              if (videoId) store.getState().start(owner, [{
                identifier: video.videoLinkIdentifier, videoId, provider: video.provider, title: video.title,
                controls: <WikiVideoPlaybackLike key={video.videoLinkIdentifier} identity={identity} video={video} />,
              }], "single");
            }}
            watchControl={<WikiVideoWatchRequestControl video={video} wikiTitle={wikiTitle} watch={watch} />}
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
                  restricted={!!watch.state(video)?.deleteRestrictedUntil}
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
