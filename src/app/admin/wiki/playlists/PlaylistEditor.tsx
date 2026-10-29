"use client";

import { Cross2Icon, DragHandleDots2Icon } from "@radix-ui/react-icons";
import { useId, useRef, useState, type PointerEvent } from "react";
import type { PlaybackSession } from "@/components/VideoPlayback/playbackStore";
import { playlistToDraft } from "@/gateways/wiki/useWikiPlaylists";
import { playlistItemKey } from "@/gateways/wiki/wikiPlaylists";
import { VideoThumbnail } from "@/components/VideoPlayback/VideoThumbnail";
import { button, type PlaybackText, type PlaylistState, type Text } from "./playlistUi";

type Drag = { pointerId: number; source: string; target: string };
const iconButton = "flex h-10 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-40";

export function PlaylistSaveButton({ state, t, disabled = false }: { state: PlaylistState; t: Text; disabled?: boolean }) {
  return (
    <div className="flex justify-end">
      <button type="button" className={button}
        disabled={disabled || state.busy || state.committed || !state.hasUnsavedChanges}
        onClick={() => void state.save()}>{t.save}</button>
    </div>
  );
}

export function PlaylistEditor({ state, t, playbackText, playback, onSelect }: {
  state: PlaylistState;
  t: Text;
  playbackText: PlaybackText;
  playback?: PlaybackSession;
  onSelect?: (identifier: string) => void;
}) {
  const list = useRef<HTMLOListElement>(null);
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState<Drag | null>(null);
  const hintId = useId();
  const { detail } = state;
  if (!detail) return null;
  const draft = state.draft ?? playlistToDraft(detail);
  const locked = state.busy || state.committed;
  const items = playback ? playback.queue.order.map((index) => {
    const track = playback.tracks[index];
    return { provider: track.provider ?? "youtube" as const, externalVideoId: track.videoId, title: track.title };
  }) : draft.items;
  const active = playback?.tracks[playback.queue.order[playback.queue.position]];
  const sources = new Map(detail.items.map((item) => [playlistItemKey(item), item]));
  const reorder = (source: string, target: string) => {
    const from = draft.items.findIndex((item) => playlistItemKey(item) === source);
    const to = draft.items.findIndex((item) => playlistItemKey(item) === target);
    if (locked || playback || from < 0 || to < 0 || from === to) return;
    const items = [...draft.items];
    const [item] = items.splice(from, 1);
    items.splice(to, 0, item);
    state.setDraft({ ...draft, items });
  };
  const clearDrag = () => {
    drag.current = null;
    setDragging(null);
  };
  const movePointer = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const rows = Array.from(list.current?.querySelectorAll<HTMLLIElement>("[data-item-key]") ?? []);
    let nearest = current.source;
    let distance = Infinity;
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const nextDistance = Math.abs(event.clientY - (rect.top + rect.height / 2));
      if (nextDistance < distance) {
        nearest = row.dataset.itemKey!;
        distance = nextDistance;
      }
    }
    if (nearest !== current.target) {
      drag.current = { ...current, target: nearest };
      setDragging(drag.current);
    }
  };
  return (
    <div className="space-y-3">
      {!playback ? <p id={hintId} className="sr-only">{t.reorderHint}</p> : null}
      {!items.length ? <p className="p-2">{t.noVideos}</p> : null}
      <ol ref={list} className="max-h-[28rem] divide-y divide-stroke-subtle overflow-y-auto overscroll-contain p-1">
        {items.map((item, index) => {
          const key = playlistItemKey(item);
          const source = sources.get(key);
          const current = active?.identifier === key;
          return (
            <li key={key} data-item-key={key}
              className={`relative flex items-center gap-3 rounded-lg px-1 py-3 ${current ? "bg-brand-highlight/30 text-brand-primary" : "text-text-strong"} ${dragging?.source === key ? "opacity-50" : ""} ${dragging?.target === key && dragging.source !== key ? "ring-2 ring-brand-primary" : ""}`}>
              <button type="button" className="absolute inset-0 rounded-lg hover:bg-brand-highlight/10 focus-visible:outline-2 focus-visible:outline-brand-primary disabled:cursor-default"
                aria-label={`${playbackText.playTrack}: ${item.title}`}
                aria-current={current ? "true" : undefined}
                disabled={!onSelect || locked || dragging !== null}
                onClick={() => onSelect?.(key)} />
              {!playback ? <button type="button" className={`${iconButton} relative touch-none cursor-grab active:cursor-grabbing`}
                aria-label={`${t.reorder}: ${item.title}`} aria-describedby={hintId}
                aria-keyshortcuts="ArrowUp ArrowDown" disabled={locked}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  event.currentTarget.focus();
                  drag.current = { pointerId: event.pointerId, source: key, target: key };
                  setDragging(drag.current);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={movePointer}
                onPointerUp={(event) => {
                  const current = drag.current;
                  if (!current || event.pointerId !== current.pointerId) return;
                  reorder(current.source, current.target);
                  clearDrag();
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onPointerCancel={clearDrag}
                onLostPointerCapture={clearDrag}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                  event.preventDefault();
                  const target = draft.items[index + (event.key === "ArrowUp" ? -1 : 1)];
                  if (target) reorder(key, playlistItemKey(target));
                }}>
                <DragHandleDots2Icon aria-hidden="true" className="h-5 w-5" />
              </button> : null}
              <div className="pointer-events-none relative shrink-0">
                <VideoThumbnail url={item.provider === "youtube" ? `https://youtu.be/${item.externalVideoId}` : ""} thumbnailUrl={source?.thumbnailUrl ?? null} />
              </div>
              <div className="pointer-events-none relative min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" title={item.title}>{item.title}</p>
                {current ? <p className="text-xs">{playbackText.nowPlaying}</p> : source?.sourceVideoLinkIdentifier === null ? (
                  <p className="truncate text-xs text-text-muted" title={t.deletedSource}>{t.deletedSource}</p>
                ) : null}
              </div>
              {!playback ? <button type="button" className={`${iconButton} relative hover:text-status-danger`}
                aria-label={`${t.remove}: ${item.title}`} disabled={locked || dragging !== null}
                onClick={() => state.setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })}>
                <Cross2Icon aria-hidden="true" className="h-4 w-4" />
              </button> : null}
            </li>
          );
        })}
      </ol>
      {!playback && state.hasUnsavedChanges ? <p className="px-2 text-xs text-text-muted">{t.draftHint}</p> : null}
      {!playback ? <PlaylistSaveButton state={state} t={t} disabled={dragging !== null} /> : null}
    </div>
  );
}
