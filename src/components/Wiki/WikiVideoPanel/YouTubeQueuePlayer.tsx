"use client";

import { useEffect, useRef, useState } from "react";
import { getYouTubeVideoId } from "@kpool/wiki";
import { useI18n } from "@/i18n/I18nProvider";

type Player = { playVideo: () => void; destroy: () => void };
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

// One mounted player per queue item. Queue progression belongs to the parent;
// this boundary owns only the external API, its events and teardown.
export function YouTubeQueuePlayer({
  videoId,
  title,
  onEnded,
  onError,
  onUnavailable,
}: {
  videoId: string;
  title: string;
  onEnded: () => void;
  onError: () => void;
  onUnavailable: () => void;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.continuous;
  const container = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | undefined>(undefined);
  const callbacks = useRef({ onEnded, onError, onUnavailable });
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    callbacks.current = { onEnded, onError, onUnavailable };
  }, [onEnded, onError, onUnavailable]);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const element = document.createElement("div");
    root.appendChild(element);
    let disposed = false,
      finished = false,
      creating = false;
    let player: Player | undefined;
    const stopWaiting = () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
    const finish = (kind: "onEnded" | "onError" | "onUnavailable") => {
      if (disposed || finished) return;
      finished = true;
      stopWaiting();
      if (!(window as YouTubeWindow).YT?.Player) script?.remove();
      callbacks.current[kind]();
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
                root.querySelector("iframe")?.setAttribute("title", title);
                player?.playVideo();
              },
              onStateChange: ({ data }) => {
                if (disposed || finished) return;
                if (data === 1) setBlocked(false);
                if (data === 0) finish("onEnded");
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
  }, [videoId, title]);
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
