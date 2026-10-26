import type { I18nDictionary } from "@/i18n/dictionaries";
import type { useWikiPlaylists } from "@/gateways/wiki/useWikiPlaylists";

export type Text = I18nDictionary["admin"]["playlists"];
export type PlaybackText = I18nDictionary["wiki"]["videos"]["continuous"];
export type PlaylistState = ReturnType<typeof useWikiPlaylists>;
export const button =
  "rounded-lg border border-stroke-subtle px-3 py-2 text-sm font-semibold hover:bg-surface-muted aria-pressed:border-brand-primary aria-pressed:bg-brand-highlight/30 focus-visible:outline-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50";
export const input =
  "min-w-0 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-sm";
export const errorText = (status: number, t: Text) =>
  status === 401 || status === 419 ? t.unauthorized
    : status === 403 ? t.forbidden
      : status === 404 ? t.notFound
        : status === 409 ? t.conflict
          : status === 422 ? t.invalid
            : status === 50 ? t.tooMany : t.failed;
export const queryErrorStatus = (error: unknown) =>
  typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
