"use client";

import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import { useVideoActionNotice } from "./useVideoActionNotice";
import type { WikiVideo } from "@/gateways/wiki/wikiVideos";
import type { useWikiVideoWatchRequests } from "@/gateways/wiki/useWikiVideoWatchRequests";
import { useI18n } from "@/i18n/I18nProvider";

export function WikiVideoWatchRequestControl({
  video,
  wikiTitle,
  watch,
}: {
  video: WikiVideo;
  wikiTitle: string;
  watch: ReturnType<typeof useWikiVideoWatchRequests>;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.watchRequests;
  const state = watch.state(video);
  const durationEligible =
    video.durationSeconds !== null && video.durationSeconds <= 30;
  const unavailableReason = state?.reason ?? (durationEligible ? null : "duration_not_eligible");
  const { root, noticeId, notice, showNotice, dismissNotice } = useVideoActionNotice(
    unavailableReason ? t[unavailableReason].replace("{title}", () => wikiTitle) : undefined,
  );

  // Server eligibility includes the exact wiki's official status and send policy.
  if (
    !state ||
    state.reason === "target_not_eligible" ||
    video.videoUsage.startsWith("youtube_auto_")
  )
    return null;

  return (
    <div ref={root} className="relative shrink-0 text-sm">
      <button
        type="button"
        className="min-h-9 whitespace-nowrap rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-on-primary aria-busy:opacity-50"
        aria-describedby={notice ? noticeId : undefined}
        aria-busy={watch.pending}
        disabled={watch.pending || watch.refreshing || state.reason === "already_watched" || (!state.canSend && !unavailableReason)}
        onClick={() => {
          if (unavailableReason) showNotice();
          else {
            dismissNotice();
            watch.send(video);
          }
        }}
      >
        {state.reason === "already_watched" ? t.already_watched : watch.pending ? t.sending : state.sent ? t.sent : t.send}
      </button>
      {notice ? (
        <div
          id={noticeId}
          role="status"
          className="absolute right-0 top-full z-10 w-64 max-w-[calc(100vw-4.5rem)] rounded-lg bg-surface-raised p-2 text-text-strong shadow-soft"
        >
          <p>{notice}</p>
          {state.nextSendAt ? (
            <p>
              {t.next}:{" "}
              <LocalizedDateTime className="break-all" value={state.nextSendAt} />
            </p>
          ) : null}
        </div>
      ) : null}
      {watch.failed ? (
        <p role="alert">
          {watch.status === 401 || watch.status === 403 ? t.auth : t.failed}
        </p>
      ) : null}
    </div>
  );
}
