"use client";

import { useEffect, useRef, useState } from "react";
import { getYouTubeVideoId } from "@kpool/wiki";
import { useI18n } from "@/i18n/I18nProvider";

type Player = {
  playVideo: () => void;
  destroy: () => void;
  getVideoUrl?: () => string;
  getPlayerState?: () => number;
};
export type QueuePlayerOptions = {
  videoId: string;
  host: string;
  width: string;
  height: string;
  playerVars: { origin: string; playsinline: number };
  events: {
    onReady: () => void;
    onStateChange: (event: { data: number }) => void;
    onError: () => void;
    onAutoplayBlocked: () => void;
  };
};
type YouTubeWindow = Window & {
  YT?: {
    Player?: new (element: HTMLElement, options: QueuePlayerOptions) => Player;
  };
};

// The parent owns queue progression. This boundary owns the external API,
// reports the actual video when it changes, and tears down completed players.
export function YouTubeQueuePlayer({
  videoId,
  title,
  onVideoChange,
  onEnded,
  onError,
  onUnavailable,
}: {
  videoId: string;
  title: string;
  onVideoChange?: (videoId: string) => void;
  onEnded: (videoId?: string) => void;
  onError: () => void;
  onUnavailable: () => void;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.continuous;
  const container = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | undefined>(undefined);
  const callbacks = useRef({ onEnded, onError, onUnavailable, onVideoChange });
  const titleRef = useRef(title);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    callbacks.current = { onEnded, onError, onUnavailable, onVideoChange };
  }, [onEnded, onError, onUnavailable, onVideoChange]);
  useEffect(() => {
    titleRef.current = title;
    container.current?.querySelector("iframe")?.setAttribute("title", title);
  }, [title]);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const element = document.createElement("div");
    root.appendChild(element);
    let disposed = false,
      finished = false,
      creating = false;
    let player: Player | undefined;
    let playbackInterval: number | undefined;
    let reportedVideoId = videoId;
    const currentVideoId = () =>
      getYouTubeVideoId(player?.getVideoUrl?.() ?? "") ?? undefined;
    const stopWaiting = () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      window.clearInterval(playbackInterval);
    };
    const finish = (kind: "onEnded" | "onError" | "onUnavailable") => {
      if (disposed || finished) return;
      finished = true;
      stopWaiting();
      if (!(window as YouTubeWindow).YT?.Player) script?.remove();
      if (kind === "onEnded") callbacks.current.onEnded(currentVideoId());
      else callbacks.current[kind]();
    };
    const checkPlayback = (state: number | undefined) => {
      if (disposed || finished) return;
      if (state === 0) {
        finish("onEnded");
      } else if (state === 1) {
        setBlocked(false);
        const id = currentVideoId();
        if (id && id !== reportedVideoId) {
          reportedVideoId = id;
          callbacks.current.onVideoChange?.(id);
        }
      }
    };
    const fail = () => finish("onUnavailable");
    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!script && !(window as YouTubeWindow).YT?.Player) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    script?.addEventListener("error", fail);
    const tick = () => {
      if (disposed || finished || creating) return;
      const Constructor = (window as YouTubeWindow).YT?.Player;
      if (!Constructor) return;
      creating = true;
      void Promise.resolve()
        .then(() => {
          if (disposed || finished) return;
          if (getYouTubeVideoId(videoId) !== videoId) {
            fail();
            return;
          }
          player = new Constructor(element, {
            videoId,
            host: "https://www.youtube-nocookie.com",
            width: "100%",
            height: "100%",
            playerVars: { origin: window.location.origin, playsinline: 1 },
            events: {
              onReady: () => {
                if (disposed || finished) return;
                stopWaiting();
                root
                  .querySelector("iframe")
                  ?.setAttribute("title", titleRef.current);
                // Reconcile with the actual player even if an ended or playing
                // notification is missed while seeking or switching videos.
                playbackInterval = window.setInterval(() => {
                  checkPlayback(player?.getPlayerState?.());
                }, 500);
                player?.playVideo();
              },
              onStateChange: ({ data }) => {
                checkPlayback(data);
              },
              onError: () => finish("onError"),
              onAutoplayBlocked: () => {
                if (!disposed && !finished) setBlocked(true);
              },
            },
          });
          playerRef.current = player;
        })
        .catch(fail);
    };
    const interval = window.setInterval(tick, 250);
    const timeout = window.setTimeout(fail, 20_000);
    tick();
    return () => {
      disposed = true;
      stopWaiting();
      script?.removeEventListener("error", fail);
      playerRef.current = undefined;
      player?.destroy();
      root.replaceChildren();
    };
  }, [videoId]);
  return (
    <div className="space-y-3">
      <div
        ref={container}
        className="aspect-video w-full overflow-hidden rounded-xl bg-surface-muted"
      />
      {blocked ? (
        <div>
          <p role="status">{t.blocked}</p>
          <button
            type="button"
            className="rounded-lg border border-stroke-subtle px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-brand-primary"
            onClick={() => playerRef.current?.playVideo()}
          >
            {t.resume}
          </button>
        </div>
      ) : null}
    </div>
  );
}
