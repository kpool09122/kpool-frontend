"use client";
import type { WikiVideo } from "@/gateways/wiki/wikiVideos";
import type { useWikiVideoWatchRequests } from "@/gateways/wiki/useWikiVideoWatchRequests";
import { useI18n } from "@/i18n/I18nProvider";
export function WikiVideoWatchRequestControl({
  video,
  watch,
}: {
  video: WikiVideo;
  watch: ReturnType<typeof useWikiVideoWatchRequests>;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.watchRequests;
  const state = watch.state(video);
  // Server eligibility includes the exact wiki's official status and send policy.
  if (
    !state ||
    state.reason === "target_not_eligible" ||
    video.videoUsage.startsWith("youtube_auto_")
  )
    return null;
  const durationEligible =
    video.durationSeconds !== null && video.durationSeconds <= 30;
  return (
    <div className="space-y-1 text-sm">
      <button
        type="button"
        className="min-h-11 rounded-lg border border-stroke-subtle px-3 disabled:opacity-50"
        disabled={!state.canSend || !durationEligible || watch.pending}
        onClick={() => watch.send(video)}
      >
        {watch.pending ? t.sending : state.sent ? t.sent : t.send}
      </button>

      {state.reason ? (
        <p>{t[state.reason]}</p>
      ) : !durationEligible ? (
        <p>{t.duration_not_eligible}</p>
      ) : null}
      <p>
        {t.remaining}: {state.remainingRequests} / 3
      </p>
      {state.nextSendAt ? (
        <p>
          {t.next}:{" "}
          <time className="break-all" dateTime={state.nextSendAt}>
            {state.nextSendAt}
          </time>
        </p>
      ) : null}
      {watch.failed ? (
        <p role="alert">
          {watch.status === 401 || watch.status === 403 ? t.auth : t.failed}
        </p>
      ) : null}
    </div>
  );
}
