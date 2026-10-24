"use client";
import { useEffect, useRef } from "react";

type Player = { getDuration: () => number; destroy: () => void };
type PlayerOptions = {
  videoId: string;
  host: string;
  width: string;
  height: string;
  playerVars: { origin: string; playsinline: number };
  events: {
    onReady: () => void;
    onStateChange: () => void;
    onError: () => void;
  };
};
type YouTubeWindow = Window & {
  YT?: {
    Player?: new (element: HTMLElement, options: PlayerOptions) => Player;
  };
};
type Props = {
  videoId: string;
  onDuration: (seconds: number) => void;
  onError: () => void;
};

export function YouTubeDurationPreview({
  videoId,
  onDuration,
  onError,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onDuration, onError });
  useEffect(() => {
    callbacks.current = { onDuration, onError };
  }, [onDuration, onError]);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const element = document.createElement("div");
    root.appendChild(element);
    let disposed = false,
      failed = false,
      ready = false,
      creating = false,
      reported = false;
    let player: Player | undefined;
    const stop = () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
    const fail = () => {
      if (disposed || failed) return;
      failed = true;
      stop();
      // A failed/timed-out script must not poison subsequent preview retries.
      if (!(window as YouTubeWindow).YT?.Player) script?.remove();
      callbacks.current.onError();
    };
    const readDuration = () => {
      if (disposed || failed || !ready || !player || reported) return;
      const value = player.getDuration();
      // getDuration() returns zero before metadata loads. Never enable save with it.
      if (Number.isFinite(value) && value > 0 && value <= 2147483647) {
        reported = true;
        stop();
        callbacks.current.onDuration(value);
      }
    };
    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("error", fail);
    // Polling for the shared API avoids replacing another player's global ready callback.
    const tick = () => {
      if (disposed || failed) return;
      const Constructor = (window as YouTubeWindow).YT?.Player;
      if (!player && !creating && Constructor) {
        creating = true;
        void Promise.resolve()
          .then(() => {
            if (disposed || failed) return;
            player = new Constructor(element, {
              videoId,
              host: "https://www.youtube-nocookie.com",
              width: "100%",
              height: "100%",
              playerVars: { origin: window.location.origin, playsinline: 1 },
              events: {
                onReady: () => {
                  ready = true;
                  readDuration();
                },
                onStateChange: readDuration,
                onError: fail,
              },
            });
          })
          .catch(fail);
      }
      readDuration();
    };
    const interval = window.setInterval(tick, 250);
    const timeout = window.setTimeout(fail, 60_000);
    tick();
    return () => {
      disposed = true;
      stop();
      script.removeEventListener("error", fail);
      player?.destroy();
      root.replaceChildren();
    };
  }, [videoId]);
  return (
    <div
      className="aspect-video w-full overflow-hidden rounded-xl bg-surface-muted"
      ref={container}
    />
  );
}
