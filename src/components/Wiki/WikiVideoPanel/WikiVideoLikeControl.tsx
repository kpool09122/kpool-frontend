"use client";

import { HeartIcon, HeartFilledIcon } from "@radix-ui/react-icons";
import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWikiVideoLikes } from "@/gateways/wiki/useWikiVideoLikes";
import { useAuthStore } from "@/gateways/auth/authStore";
import { fetchWikiVideos, type WikiVideo, type WikiVideoIdentity } from "@/gateways/wiki/wikiVideos";
import { useI18n } from "@/i18n/I18nProvider";

export function WikiVideoLikeControl({ video, likes, compact = false }: {
  compact?: boolean;
  video: WikiVideo;
  likes: ReturnType<typeof useWikiVideoLikes>;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.likes;
  const state = likes.state(video);
  const gradientId = useId();
  return (
    <div className={compact ? "relative shrink-0" : undefined}>
      <button
        type="button"
        aria-label={`${state.liked ? t.unlike : t.like}: ${video.title}`}
        aria-pressed={state.liked}
        disabled={state.disabled}
        onClick={() => void likes.toggle(video)}
        className={`inline-flex items-center justify-center rounded-lg text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed ${compact ? "h-10 w-10" : "min-h-11 min-w-11 gap-2 px-3"}`}
      >
        {state.liked ? (
          <svg aria-hidden="true" viewBox="0 0 15 15" className="h-5 w-5">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffdc80" />
                <stop offset="25%" stopColor="#fcaf45" />
                <stop offset="50%" stopColor="#f56040" />
                <stop offset="75%" stopColor="#e1306c" />
                <stop offset="100%" stopColor="#833ab4" />
              </linearGradient>
            </defs>
            <HeartFilledIcon color={`url(#${gradientId})`} />
          </svg>
        ) : (
          <HeartIcon aria-hidden="true" className="h-5 w-5" />
        )}
        {!compact ? <span className="tabular-nums" aria-live="polite">{state.count}</span> : null}
      </button>
      {state.failed ? <p role="alert" className={compact ? "absolute right-0 top-full z-10 w-48 rounded-lg bg-surface-raised p-2 text-sm shadow-soft" : undefined}>{t.failed}</p> : null}
    </div>
  );
}

export function WikiVideoPlaybackLike({ identity, video }: {
  identity: WikiVideoIdentity;
  video: WikiVideo;
}) {
  const sessionKey = useAuthStore((state) => [
    state.status,
    state.identity?.identityIdentifier,
    state.identity?.accountIdentifier,
    state.identity?.accountPrincipalIdentifier,
    state.sessionVersion,
  ].join(":"));
  const query = useQuery({
    queryKey: ["public-wiki-videos", identity.language, identity.resourceType, identity.slug, {}],
    queryFn: () => fetchWikiVideos(identity),
    staleTime: 60_000,
  });
  const current = query.data?.videos.find((item) => item.videoLinkIdentifier === video.videoLinkIdentifier) ?? video;
  const likes = useWikiVideoLikes(identity, [current], sessionKey);
  return <WikiVideoLikeControl video={current} likes={likes} compact />;
}
