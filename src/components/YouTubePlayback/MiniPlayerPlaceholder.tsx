"use client";

import { useI18n } from "@/i18n/I18nProvider";

export function MiniPlayerPlaceholder() {
  const { dictionary } = useI18n();
  return (
    <div role="status" className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-white/15 bg-black px-4 py-6 text-center text-white">
      <svg aria-hidden="true" viewBox="0 0 48 36" fill="none" className="h-9 w-12 text-white/60">
        <rect x="2" y="2" width="44" height="32" rx="3" stroke="currentColor" strokeWidth="2" />
        <rect x="25" y="18" width="16" height="11" rx="1" fill="currentColor" />
      </svg>
      <p className="text-sm font-medium">{dictionary.wiki.videos.continuous.playingInMiniPlayer}</p>
    </div>
  );
}
