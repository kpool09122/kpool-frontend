"use client";

import { WikiVideoWatchRequestControl } from "./WikiVideoWatchRequestControl";
import { useWikiVideoWatchRequests } from "@/gateways/wiki/useWikiVideoWatchRequests";
import { useOfficialVideoWatch } from "@/gateways/wiki/useOfficialVideoWatch";
import Image from "next/image";
import { officialVideoInboxErrorStatus, fetchOfficialRequestVideos } from "@/gateways/wiki/officialVideoInbox";
import { OfficialVideoInboxList } from "./OfficialVideoInboxList";
import { WikiVideoLikeControl, WikiVideoPlaybackLike } from "./WikiVideoLikeControl";
import { useWikiVideoLikes } from "@/gateways/wiki/useWikiVideoLikes";
import { VideoQueueControls } from "@/components/VideoPlayback/VideoQueueControls";
import { VideoPlaybackQueue } from "@/components/VideoPlayback/VideoPlaybackQueue";
import { adjacentPlaybackIndex, nextLoopMode, type LoopMode } from "@/components/VideoPlayback/playbackQueue";
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
import { QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
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
      {!videoId || likeControl || watchControl ? (
        <div className="mt-auto flex flex-wrap items-center justify-end gap-3">
          {!videoId ? <p role="status" className="mr-auto">{t.unavailable}</p> : null}
          {likeControl}
          {watchControl}
        </div>
      ) : null}
    </li>
  );
}

type WikiVideoPanelProps = WikiVideoIdentity & {
  wikiIdentifier?: string;
  officialInboxWikiIdentifier?: string;
  officialInboxUnwatchedOnly?: boolean;
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
  officialInboxWikiIdentifier,
  officialInboxUnwatchedOnly = true,
  wikiTitle,
  ...identity
}: WikiVideoPanelProps) {
  const queryClient = useQueryClient();
  return (
    <>
      {wikiIdentifier && !officialInboxWikiIdentifier ? (
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
      {officialInboxWikiIdentifier ? <VideoList key={officialInboxWikiIdentifier} identity={identity} wikiTitle={wikiTitle} filter={{ recentWatchRequestsOnly: true, sortByWatchRequests: true }} officialInboxWikiIdentifier={officialInboxWikiIdentifier} unwatchedOnly={officialInboxUnwatchedOnly} /> : <VideoSearch
        key={`${identity.language}:${identity.resourceType}:${identity.slug}`}
        identity={identity}
        wikiTitle={wikiTitle}
      />}
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
  officialInboxWikiIdentifier,
  unwatchedOnly = true,
}: {
  identity: WikiVideoIdentity;
  wikiTitle: string;
  filter: DurationFilter;
  officialInboxWikiIdentifier?: string;
  unwatchedOnly?: boolean;
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
      ...(officialInboxWikiIdentifier ? ["official-inbox", access.sessionKey, officialInboxWikiIdentifier] : []),
    ],
    queryFn: ({ signal }) => officialInboxWikiIdentifier ? fetchOfficialRequestVideos(officialInboxWikiIdentifier, signal) : fetchWikiVideos({ ...identity, ...filter }),
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
        <p>{officialInboxWikiIdentifier && [401, 403].includes(Number(officialVideoInboxErrorStatus(query.error))) ? dictionary.admin.officialVideoInbox.forbidden : t.error}</p>
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
        (officialInboxWikiIdentifier ? [...query.data.videos].sort((a, b) => a.videoLinkIdentifier.localeCompare(b.videoLinkIdentifier)) : query.data.videos).map((video) => [
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
      ownerInbox={!!officialInboxWikiIdentifier}
      unwatchedOnly={unwatchedOnly}
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
  ownerInbox = false,
  unwatchedOnly = true,
}: {
  identity: WikiVideoIdentity;
  wikiTitle: string;
  videos: WikiVideo[];
  emptyMessage: string;
  access: ReturnType<typeof useWikiVideoDeleteAccess>;
  likes: ReturnType<typeof useWikiVideoLikes>;
  watch: ReturnType<typeof useWikiVideoWatchRequests>;
  onDeleted: (video: WikiVideo) => void;
  ownerInbox?: boolean;
  unwatchedOnly?: boolean;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.continuous;
  const queryClient = useQueryClient();
  const playbackLike = (video: WikiVideo) => <QueryClientProvider client={queryClient}><WikiVideoPlaybackLike key={video.videoLinkIdentifier} identity={identity} video={video} wikiTitle={wikiTitle} /></QueryClientProvider>;
  const completion = useOfficialVideoWatch(access.sessionKey);
  const [watchedOnEntry] = useState(() => new Set(videos.filter((video) => video.hasOfficialOwnerWatch).map((video) => video.videoLinkIdentifier)));
  const visibleVideos = ownerInbox && unwatchedOnly ? videos.filter((video) => !watchedOnEntry.has(video.videoLinkIdentifier)) : videos;
  const queue = visibleVideos.flatMap((video) => {
    const videoId = isVideoId(video.provider, video.externalVideoId) ? video.externalVideoId : null;
    return videoId ? [{ video, videoId }] : [];
  });
  const { store } = useVideoPlayback()!;
  const instanceId = useId();
  const owner = ownerInbox ? `private-wiki-inbox:${instanceId}` : instanceId;
  usePlaybackOwner(store, owner);
  const previousUnwatchedOnly = useRef(unwatchedOnly);
  useEffect(() => {
    if (ownerInbox && previousUnwatchedOnly.current !== unwatchedOnly && store.getState().session?.owner === owner) {
      store.getState().stop();
    }
    previousUnwatchedOnly.current = unwatchedOnly;
  }, [unwatchedOnly, ownerInbox, owner, store]);
  useEffect(() => () => {
    // Private inbox playback must not outlive its ownership/Principal boundary.
    const state = store.getState();
    if (ownerInbox && (state.session?.owner === owner || state.notice?.owner === owner)) state.stop();
  }, [store, owner, ownerInbox]);
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
  const inboxList = ownerInbox ? (
    <OfficialVideoInboxList
      wikiTitle={wikiTitle}
      likes={likes}
      videos={playback ? playback.queue.order.flatMap((index) => {
        const video = videos.find((item) => item.videoLinkIdentifier === playback.tracks[index].identifier);
        return video ? [video] : [];
      }) : visibleVideos}
      activeIdentifier={active?.identifier}
      onSelect={(identifier) => {
        if (playback) store.getState().selectTrack(playback.id, identifier);
        else store.getState().start(owner, queue.map(({ video, videoId }) => ({
          identifier: video.videoLinkIdentifier, videoId, provider: video.provider, title: video.title,
          controls: playbackLike(video),
          onEnded: ownerInbox ? () => completion.record(video.videoLinkIdentifier) : undefined,
        })), "queue", loop, random, identifier);
      }}
    />
  ) : null;
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
        navigation={ownerInbox && playback?.kind === "queue" && !floating ? {
          onPrevious: adjacentPlaybackIndex(playback.queue, -1, loop) === undefined ? undefined : () => {
            const index = adjacentPlaybackIndex(playback.queue, -1, loop);
            if (index !== undefined) store.getState().selectTrack(playback.id, playback.tracks[index].identifier);
          },
          onNext: adjacentPlaybackIndex(playback.queue, 1, loop) === undefined ? undefined : () => {
            const index = adjacentPlaybackIndex(playback.queue, 1, loop);
            if (index !== undefined) store.getState().selectTrack(playback.id, playback.tracks[index].identifier);
          },
        } : undefined}
        onToggleRandom={toggleRandom}
        onToggleLoop={() => setLoop(nextLoopMode(loop))}
        onStart={() => {
          store.getState().start(owner, queue.map(({ video, videoId }) => ({
            identifier: video.videoLinkIdentifier, videoId, provider: video.provider, title: video.title,
            controls: playbackLike(video),
            onEnded: ownerInbox ? () => completion.record(video.videoLinkIdentifier) : undefined,
          })), "queue", loop, random);
        }}
        onStop={playback ? () => {
          restoreFocus.current = true;
          store.getState().stop();
        } : undefined}
      />
      {notice ? <p role="status">{notice}</p> : null}
      {ownerInbox && completion.failed ? <div role="alert">
        <p>{dictionary.admin.officialVideoInbox.watchSaveFailed}</p>
        <button type="button" className="min-h-11 underline" disabled={completion.pending} onClick={completion.retry}>{dictionary.admin.officialVideoInbox.watchSaveRetry}</button>
      </div> : null}
      {ownerInbox ? (
        <div className={playback ? "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_15rem] xl:grid-cols-[minmax(0,1fr)_18rem]" : undefined}>
          {playback ? <>
            <div className="min-w-0"><PlaybackOutlet owner={owner} preserveSpace /></div>
            <VideoPlaybackQueue session={playback} t={t}>{inboxList}</VideoPlaybackQueue>
          </> : inboxList}
        </div>
      ) : playback?.kind === "queue" ? <PlaybackOutlet owner={owner} /> : null}
      {!ownerInbox && likes.loading ? <p role="status">{dictionary.wiki.videos.likes.loading}</p> : null}
      {likes.error ? <div role="alert"><p>{dictionary.wiki.videos.likes.loadError}</p><button type="button" className="min-h-11 underline" onClick={likes.retry}>{dictionary.wiki.videos.likes.retry}</button></div> : null}
      {!ownerInbox && watch.loading ? <p role="status">{dictionary.wiki.videos.watchRequests.loading}</p> : null}
      {!ownerInbox && watch.error ? <div role="alert"><p>{dictionary.wiki.videos.watchRequests.loadError}</p><button type="button" className="min-h-11 underline" onClick={watch.retry}>{dictionary.wiki.videos.watchRequests.retry}</button></div> : null}
      {!visibleVideos.length ? <p>{emptyMessage}</p> : null}
      {!ownerInbox ? <ul className="grid gap-5 sm:grid-cols-2">
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
                controls: playbackLike(video),
              }], "single");
            }}
            watchControl={!ownerInbox ? <WikiVideoWatchRequestControl video={video} wikiTitle={wikiTitle} watch={watch} /> : undefined}
            likeControl={!ownerInbox ? <WikiVideoLikeControl video={video} wikiTitle={wikiTitle} likes={likes} /> : undefined}
            deleteControl={
              !ownerInbox && access.principalIdentifier &&
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
      </ul> : null}
    </div>
  );
}
