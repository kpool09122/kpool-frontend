"use client";

import { VideoThumbnail } from "@/components/VideoPlayback/VideoThumbnail";
import type { WikiVideo } from "@/gateways/wiki/wikiVideos";
import { useI18n } from "@/i18n/I18nProvider";
import { isVideoId } from "@kpool/wiki";
import type { useWikiVideoLikes } from "@/gateways/wiki/useWikiVideoLikes";
import { WikiVideoLikeControl } from "./WikiVideoLikeControl";

export function OfficialVideoInboxList({ videos, wikiTitle, activeIdentifier, onSelect, likes }: {
  videos: WikiVideo[];
  wikiTitle: string;
  activeIdentifier?: string;
  onSelect: (identifier: string) => void;
  likes: ReturnType<typeof useWikiVideoLikes>;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.continuous;
  return (
    <ol className="max-h-[28rem] divide-y divide-stroke-subtle overflow-y-auto overscroll-contain p-1">
      {videos.map((video) => {
        const current = video.videoLinkIdentifier === activeIdentifier;
        return (
          <li key={video.videoLinkIdentifier} aria-current={current ? "true" : undefined}
            className={`relative flex items-center gap-3 rounded-lg px-1 py-3 ${current ? "bg-brand-highlight/30 text-brand-primary" : "text-text-strong"}`}>
            <button type="button"
              className="absolute inset-0 rounded-lg hover:bg-brand-highlight/10 focus-visible:outline-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed"
              aria-label={`${t.playTrack}: ${video.title}`}
              aria-current={current ? "true" : undefined}
              disabled={!isVideoId(video.provider, video.externalVideoId)}
              onClick={() => onSelect(video.videoLinkIdentifier)} />
            <div className="pointer-events-none relative shrink-0">
              <VideoThumbnail url={video.url} thumbnailUrl={video.thumbnailUrl} />
            </div>
            <div className="pointer-events-none relative min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold" title={video.title}>{video.title}</h2>
              {current ? <p className="text-xs">{t.nowPlaying}</p> : null}
            </div>
            <div className="relative shrink-0">
              <WikiVideoLikeControl video={video} wikiTitle={wikiTitle} likes={likes} compact />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
