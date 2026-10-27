"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { isVideoId } from "@kpool/wiki";
import { useI18n } from "@/i18n/I18nProvider";

const origin = "https://www.tiktok.com";
// One mount per playback request, not per presentation mode. Old frames cannot
// report into a subsequent request (including repeat-one of the same video).
export function TikTokPlayer({ videoId, title, expanded = false, advanceOnError = true, autoplay = true, onPlaying, onEnded, onError }: {
  videoId: string;
  title: string;
  expanded?: boolean;
  advanceOnError?: boolean;
  autoplay?: boolean;
  onPlaying?: () => void;
  onEnded: () => void;
  onError: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [guidance, setGuidance] = useState<"tiktokBlocked" | "tiktokUnavailable" | "tiktokRestricted" | null>(null);
  const ready = useRef(false);
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.continuous;
  const reportPlaying = useEffectEvent(() => onPlaying?.());
  const reportEnded = useEffectEvent(onEnded);
  const reportError = useEffectEvent(onError);
  useEffect(() => {
    const element = frame.current;
    let disposed = false, started = false, finished = false;
    let muted: boolean | undefined;
    const command = (type: "unMute" | "play" | "pause") => {
      element?.contentWindow?.postMessage({ "x-tiktok-player": true, type }, origin);
    };
    ready.current = false;
    const timeout = window.setTimeout(() => {
      if (!disposed && !ready.current) {
        setGuidance("tiktokUnavailable");
      }
    }, 20000);
    const fail = (restricted = false) => {
      finished = true;
      window.clearTimeout(timeout);
      if (advanceOnError) reportError();
      else {
        ready.current = false;
        setGuidance(restricted ? "tiktokRestricted" : "tiktokUnavailable");
      }
    };
    const receive = (event: MessageEvent<unknown>) => {
      if (disposed || finished || event.origin !== origin || event.source !== element?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object" || !("x-tiktok-player" in data) || data["x-tiktok-player"] !== true || !("type" in data)) return;
      const value = "value" in data ? data.value : undefined;
      if (data.type === "onPlayerReady") {
        ready.current = true;
        window.clearTimeout(timeout);
        command("unMute");
        if (autoplay) command("play");
      } else if (data.type === "onMute" && typeof value === "boolean") {
        muted = value;
      } else if (data.type === "onStateChange" && typeof value === "number") {
        if (value === 1) {
          // Ready-time unMute can be superseded by the player's startup mute.
          // Retry once at first playback; later mute choices belong to the viewer.
          if (!started && muted === true) command("unMute");
          started = true;
          setGuidance(null);
          reportPlaying();
        }
        if (value === 0 && started) { finished = true; reportEnded(); }
      } else if (data.type === "onPlayerError" && value && typeof value === "object" && "errorCode" in value && typeof value.errorCode === "number" && "errorType" in value && typeof value.errorType === "string") {
        if (value.errorCode === 3002) setGuidance("tiktokBlocked");
        else fail([1001, 1002].includes(value.errorCode));
      } else if (data.type === "onError" && typeof value === "number" && [1, 2, 3, 4].includes(value)) {
        // TikTok emits legacy code 1 before the detailed onPlayerError event.
        if (value !== 1) fail();
      }
    };
    window.addEventListener("message", receive);
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
      command("pause");
    };
  }, [videoId, advanceOnError, autoplay]);
  return <div className={expanded ? "flex h-full min-h-0 flex-col gap-3" : "space-y-3"}>
    <div className={expanded ? "min-h-0 w-full flex-1 bg-black" : "aspect-video w-full overflow-hidden rounded-xl bg-black"}>
      <iframe ref={frame} title={title} src={isVideoId("tiktok", videoId) ? `${origin}/player/v1/${videoId}?loop=0&autoplay=${autoplay ? 1 : 0}&controls=1&muted=0` : undefined}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="block h-full w-full border-0" />
    </div>
    {guidance ? <p role="status">{t[guidance]}</p> : null}
  </div>;
}
