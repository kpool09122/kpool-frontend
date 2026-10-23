"use client";

import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getYouTubeVideoId, getYouTubeThumbnailUrl } from "@kpool/wiki";
import {
  fetchWikiVideos,
  type WikiVideo,
  type WikiVideoIdentity,
} from "@/gateways/wiki/wikiVideos";
import { useI18n } from "@/i18n/I18nProvider";
import { WikiEmbedFrame } from "../WikiEmbedFrame";
import { WikiVideoCreateEntry } from "../WikiVideoCreateForm/WikiVideoCreateEntry";

function VideoCard({ video }: { video: WikiVideo }) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos;
  const [playing, setPlaying] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const videoId = getYouTubeVideoId(video.url);
  const thumbnail = getYouTubeThumbnailUrl(video.thumbnailUrl);
  return (
    <li className="min-w-0 space-y-3 rounded-2xl border border-stroke-subtle bg-surface-base p-4">
      <h2 className="break-words text-lg font-semibold">{video.title}</h2>
      {playing && videoId ? (
        <WikiEmbedFrame
          block={{
            blockType: "embed",
            blockIdentifier: video.videoLinkIdentifier,
            displayOrder: video.displayOrder,
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
  return (
    <>
      {wikiIdentifier ? (
        <WikiVideoCreateEntry
          key={`${wikiIdentifier}:${identity.resourceType}`}
          wikiIdentifier={wikiIdentifier}
          resourceType={identity.resourceType}
        />
      ) : null}
      <VideoList {...identity} />
    </>
  );
}

function VideoList(identity: WikiVideoIdentity) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos;
  const query = useQuery({
    queryKey: [
      "public-wiki-videos",
      identity.language,
      identity.resourceType,
      identity.slug,
    ],
    queryFn: () => fetchWikiVideos(identity),
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
  if (!query.data.videos.length) return <p>{t.empty}</p>;
  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {query.data.videos.map((video) => (
        <VideoCard
          key={`${identity.language}:${identity.resourceType}:${identity.slug}:${video.videoLinkIdentifier}`}
          video={video}
        />
      ))}
    </ul>
  );
}
