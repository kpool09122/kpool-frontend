"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { isVideoId } from "@kpool/wiki";
import { useI18n } from "@/i18n/I18nProvider";

const origin = "https://www.tiktok.com";
// One mount per playback request, not per presentation mode. Old frames cannot
// report into a subsequent request (including repeat-one of the same video).
export function TikTokPlayer({ videoId, title, expanded = false, onEnded, onError }: {
  videoId: string;
  title: string;
  expanded?: boolean;
  onEnded: () => void;
  onError: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [guidance, setGuidance] = useState<"blocked" | "unavailable" | null>(null);
  const ready = useRef(false);
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.continuous;
  const reportEnded = useEffectEvent(onEnded);
  const reportError = useEffectEvent(onError);
  const command = (type: "play" | "pause") => frame.current?.contentWindow?.postMessage({ "x-tiktok-player": true, type }, origin);
  useEffect(() => {
    const element = frame.current;
    let disposed = false, started = false, finished = false;
    ready.current = false;
    const timeout = window.setTimeout(() => { if (!disposed && !ready.current) setGuidance("unavailable"); }, 20000);
    const receive = (event: MessageEvent<unknown>) => {
      if (disposed || finished || event.origin !== origin || event.source !== element?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object" || !("x-tiktok-player" in data) || data["x-tiktok-player"] !== true || !("type" in data)) return;
      const value = "value" in data ? data.value : undefined;
      if (data.type === "onPlayerReady") {
        ready.current = true;
        window.clearTimeout(timeout);
        element?.contentWindow?.postMessage({ "x-tiktok-player": true, type: "play" }, origin);
      } else if (data.type === "onStateChange" && typeof value === "number") {
        if (value === 1) { started = true; setGuidance(null); }
        if (value === 0 && started) { finished = true; reportEnded(); }
      } else if (data.type === "onPlayerError" && value && typeof value === "object" && "errorCode" in value && typeof value.errorCode === "number" && "errorType" in value && typeof value.errorType === "string") {
        if (value.errorCode === 3002) setGuidance("blocked");
        else { finished = true; reportError(); }
      } else if (data.type === "onError" && typeof value === "number" && [1, 2, 3, 4].includes(value)) {
        finished = true; reportError();
      }
    };
    window.addEventListener("message", receive);
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
      element?.contentWindow?.postMessage({ "x-tiktok-player": true, type: "pause" }, origin);
    };
  }, [videoId, attempt]);
  return <div className={expanded ? "flex h-full min-h-0 flex-col gap-3" : "space-y-3"}>
    <div className={expanded ? "min-h-0 w-full flex-1 bg-black" : "aspect-video w-full overflow-hidden rounded-xl bg-black"}>
      <iframe key={attempt} ref={frame} title={title} src={isVideoId("tiktok", videoId) ? `${origin}/player/v1/${videoId}?loop=0&autoplay=1&controls=1` : undefined}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="block h-full w-full border-0" />
    </div>
    {guidance ? <div><p role="status">{t[guidance]}</p>
      <button type="button" className="min-h-11 rounded-lg border px-4" onClick={() => { if (ready.current) command("play"); else { setGuidance(null); setAttempt((n) => n + 1); } }}>{t.resume}</button>
      <button type="button" className="min-h-11 rounded-lg border px-4" onClick={onError}>{t.next}</button>
    </div> : null}
  </div>;
}
