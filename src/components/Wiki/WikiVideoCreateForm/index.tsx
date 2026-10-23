"use client";
import { useRef, useState } from "react";
import { getYouTubeVideoId, normalizeYouTubeVideoUrl } from "@kpool/wiki";
import {
  createWikiVideo,
  wikiVideoCreateSchema,
  type WikiVideoCreateRequest,
} from "@/gateways/wiki/wikiVideoCreate";
import { useI18n } from "@/i18n/I18nProvider";
import { YouTubeDurationPreview } from "../YouTubeDurationPreview";

type Props = Pick<WikiVideoCreateRequest, "wikiIdentifier" | "resourceType">;
export function WikiVideoCreateForm(identity: Props) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.create;
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [videoUsage, setVideoUsage] =
    useState<WikiVideoCreateRequest["videoUsage"]>("music_video");
  const [order, setOrder] = useState("0");
  const [duration, setDuration] = useState<number | null>(null);
  const [playerFailed, setPlayerFailed] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; status: number } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const videoId = getYouTubeVideoId(url.trim());
  const canonicalUrl = normalizeYouTubeVideoUrl(url);
  const payload = {
    ...identity,
    url: canonicalUrl,
    title,
    videoUsage,
    displayOrder: order.trim() ? Number(order) : -1,
    durationSeconds: duration,
  };
  const parsed = wikiVideoCreateSchema.safeParse(payload);
  const denied =
    result?.status === 401 || result?.status === 403 || result?.status === 419;
  const error =
    result && !result.ok
      ? result.status === 401 || result.status === 419
        ? t.unauthorized
        : result.status === 403
          ? t.forbidden
          : result.status === 409
            ? t.duplicate
            : result.status === 422
              ? t.invalidInput
              : t.saveError
      : null;
  const submit = () => {
    if (!parsed.success || savingRef.current || playerFailed || denied) return;
    savingRef.current = true;
    setSaving(true);
    setResult(null);
    void createWikiVideo(parsed.data).then((response) => {
      setResult(response);
      if (response.ok) {
        setUrl("");
        setTitle("");
        setDuration(null);
      }
      savingRef.current = false;
      setSaving(false);
    });
  };
  const field =
    "w-full rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2";
  return (
    <form
      aria-label={t.add}
      className="mb-6 space-y-4 rounded-2xl border border-stroke-subtle p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="text-lg font-semibold">{t.add}</h2>
      <fieldset disabled={saving} className="space-y-4">
        <label className="block">
          {t.url}
          <input
            className={field}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setDuration(null);
              setPlayerFailed(false);
              setResult((old) =>
                old && !old.ok && [401, 403, 419].includes(old.status)
                  ? old
                  : null,
              );
            }}
          />
        </label>
        {url && !videoId ? <p role="alert">{t.invalidUrl}</p> : null}
        {videoId ? (
          <>
            <YouTubeDurationPreview
              key={`${url}:${previewVersion}`}
              videoId={videoId}
              onDuration={(value) => setDuration(Math.ceil(value))}
              onError={() => {
                setPlayerFailed(true);
                setDuration(null);
              }}
            />
            {playerFailed ? (
              <div>
                <p role="alert">{t.playerError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setPlayerFailed(false);
                    setDuration(null);
                    setPreviewVersion((v) => v + 1);
                  }}
                >
                  {t.retryPreview}
                </button>
              </div>
            ) : (
              <p>
                {duration === null
                  ? t.loadingDuration
                  : `${t.duration}: ${duration}`}
              </p>
            )}
          </>
        ) : null}
        <label className="block">
          {t.title}
          <input
            className={field}
            required
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block">
          {t.usage}
          <select
            className={field}
            value={videoUsage}
            onChange={(e) =>
              setVideoUsage(
                e.target.value as WikiVideoCreateRequest["videoUsage"],
              )
            }
          >
            {Object.entries(t.usages).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          {t.order}
          <input
            className={field}
            type="number"
            min={0}
            max={2147483647}
            step={1}
            required
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
        </label>
        <button
          className="rounded-lg bg-brand-primary px-4 py-2 text-white disabled:opacity-50"
          disabled={!parsed.success || saving || playerFailed || denied}
          type="submit"
        >
          {saving ? t.saving : t.save}
        </button>
      </fieldset>
      {error ? <p role="alert">{error}</p> : null}
      {result?.ok ? <p role="status">{t.saved}</p> : null}
    </form>
  );
}
