"use client";

import { HeartIcon, HeartFilledIcon } from "@radix-ui/react-icons";
import { useId } from "react";
import { useVideoActionNotice } from "./useVideoActionNotice";
import { useQuery } from "@tanstack/react-query";
import { useWikiVideoLikes } from "@/gateways/wiki/useWikiVideoLikes";
import { useAuthStore } from "@/gateways/auth/authStore";
import { fetchWikiVideos, type WikiVideo, type WikiVideoIdentity } from "@/gateways/wiki/wikiVideos";
import { useI18n } from "@/i18n/I18nProvider";

function GradientHeart({ official = false }: { official?: boolean }) {
  const gradientId = useId();
  const colors = official
    ? ["#67e8f9", "#38bdf8", "#3b82f6", "#4f46e5"]
    : ["#ffdc80", "#fcaf45", "#f56040", "#e1306c", "#833ab4"];
  return (
    <svg aria-hidden="true" viewBox="0 0 15 15" className="h-5 w-5 shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          {colors.map((color, index) => (
            <stop key={color} offset={`${index / (colors.length - 1) * 100}%`} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <HeartFilledIcon color={`url(#${gradientId})`} />
    </svg>
  );
}

export function WikiVideoLikeControl({ video, likes, compact = false }: {
  compact?: boolean;
  video: WikiVideo;
  likes: ReturnType<typeof useWikiVideoLikes>;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.likes;
  const state = likes.state(video);
  const message = state.unavailableReason
    ? t[state.unavailableReason]
    : state.restricted ? dictionary.wiki.videos.watchRequests.unlikeRestricted : undefined;
  const { root, noticeId, notice, showNotice } = useVideoActionNotice(message);
  const messageClass = "absolute right-0 top-full z-10 w-48 rounded-lg bg-surface-raised p-2 text-sm text-text-strong shadow-soft";
  return (
    <div ref={root} className="relative inline-flex flex-wrap items-center justify-end gap-x-2">
      {video.hasOfficialOwnerLike ? (
        <span
          role={compact ? "img" : undefined}
          aria-label={compact ? dictionary.wiki.videos.watchRequests.official : undefined}
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-text-muted"
        >
          <GradientHeart official />
          {!compact ? <span>{dictionary.wiki.videos.watchRequests.official}</span> : null}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={`${state.liked ? t.unlike : t.like}: ${video.title}`}
        aria-pressed={state.liked}
        aria-describedby={notice ? noticeId : undefined}
        disabled={state.disabled && !message}
        onClick={() => {
          if (message) showNotice();
          else void likes.toggle(video);
        }}
        className={`inline-flex items-center justify-center rounded-lg text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed ${compact ? "h-10 w-10" : "min-h-11 min-w-11 gap-2 px-3"}`}
      >
        {state.liked ? (
          <GradientHeart />
        ) : (
          <HeartIcon aria-hidden="true" className="h-5 w-5" />
        )}
        {!compact ? <span className="tabular-nums" aria-live="polite">{state.count}</span> : null}
      </button>
      {notice ? <p id={noticeId} role="status" className={messageClass}>{notice}</p> : null}
      {state.failed ? <p role="alert" className={messageClass}>{t.failed}</p> : null}
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
