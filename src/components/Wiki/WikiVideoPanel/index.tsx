"use client";

import Image from "next/image";
import { useState } from "react";
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
}: {
  video: WikiVideo;
  deleteControl?: React.ReactNode;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos;
  const [playing, setPlaying] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const videoId = getYouTubeVideoId(video.url);
  const thumbnail = getYouTubeThumbnailUrl(video.thumbnailUrl);
  const duration = formatVideoDuration(video.durationSeconds);
  return (
    <li className="min-w-0 space-y-3 rounded-2xl border border-stroke-subtle bg-surface-base p-4">
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
          onClick={() => setPlaying(true)}
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
  const [filter, setFilter] = useState<DurationFilter>({});
  return (
    <>
      <WikiVideoDurationFilter onSearch={setFilter} />
      <VideoList identity={identity} filter={filter} />
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
  if (!query.data.videos.length)
    return <p>{Object.keys(filter).length ? t.filter.empty : t.empty}</p>;
  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {query.data.videos.map((video) => (
        <VideoCard
          key={`${identity.language}:${identity.resourceType}:${identity.slug}:${video.videoLinkIdentifier}`}
          video={video}
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
  );
}
