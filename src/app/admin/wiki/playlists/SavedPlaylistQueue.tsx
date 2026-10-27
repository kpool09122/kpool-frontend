"use client";

import type { ReactNode } from "react";
import type { PlaybackSession } from "@/components/VideoPlayback/playbackStore";
import type { PlaybackText } from "./playlistUi";

export function SavedPlaylistQueue({ session, t, children }: {
  session: PlaybackSession;
  t: PlaybackText;
  children: ReactNode;
}) {
  const { queue } = session;
  return (
    <aside aria-label={t.queue} className="min-w-0 overflow-hidden rounded-xl border border-stroke-subtle bg-surface-base">
      <div className="flex items-center justify-between gap-3 border-b border-stroke-subtle p-3">
        <h4 className="font-semibold">{t.queue}</h4>
        <span className="text-sm tabular-nums text-text-muted">{queue.position + 1}/{queue.order.length}</span>
      </div>
      <div className="p-2">{children}</div>
    </aside>
  );
}
