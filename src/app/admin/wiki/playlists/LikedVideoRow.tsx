"use client";

import { useCallback, useId, useRef, useState } from "react";
import type { LikedVideo } from "@/gateways/wiki/wikiPlaylists";
import { button, type Text } from "./playlistUi";
import { PlaylistVideoThumbnail } from "./PlaylistVideoThumbnail";

export function LikedVideoRow({
  video,
  playlists,
  disabled,
  onSelect,
  t,
}: {
  video: LikedVideo;
  playlists: Array<{
    playlistIdentifier: string;
    name: string;
    reason: string | null;
  }>;
  disabled: boolean;
  onSelect: (identifier: string) => void;
  t: Text;
}) {
  const [choosing, setChoosing] = useState(false);
  const chooserId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => setChoosing(false);
  const openDialog = useCallback((dialog: HTMLDialogElement | null) => {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => {
      dialog.close?.();
      trigger.current?.focus();
    };
  }, []);
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <PlaylistVideoThumbnail url={video.url} thumbnailUrl={video.thumbnailUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate" title={video.title}>{video.title}</p>
          <p className="text-sm text-text-muted">
            {video.language} · {video.resourceType}
          </p>
        </div>
        <button
          ref={trigger}
          type="button"
          className={`${button} shrink-0 text-xl`}
          aria-label={`${t.add}: ${video.title}`}
          aria-haspopup="dialog"
          aria-controls={chooserId}
          disabled={disabled}
          onClick={() => setChoosing(!choosing)}
        >
          <span aria-hidden="true">＋</span>
        </button>
      </div>
      {choosing ? (
        <dialog
          ref={openDialog}
          id={chooserId}
          aria-labelledby={`${chooserId}-title`}
          aria-describedby={`${chooserId}-video`}
          aria-modal="true"
          className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md space-y-4 overflow-y-auto rounded-xl border border-stroke-subtle bg-surface-raised p-6 text-text-strong shadow-soft backdrop:bg-black/45"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
        >
          <h2 id={`${chooserId}-title`} className="text-lg font-semibold">{t.choose}</h2>
          <p id={`${chooserId}-video`} className="break-words text-sm text-text-muted">{video.title}</p>
          {!playlists.length ? (
            <p className="text-sm text-text-muted">{t.empty}</p>
          ) : null}
          <ul className="space-y-2">
            {playlists.map((playlist) => (
              <li key={playlist.playlistIdentifier}>
                <button
                  type="button"
                  className={`${button} w-full text-left`}
                  aria-label={playlist.name}
                  aria-describedby={
                    playlist.reason
                      ? `${chooserId}-${playlist.playlistIdentifier}-reason`
                      : undefined
                  }
                  disabled={disabled || !!playlist.reason}
                  onClick={() => {
                    onSelect(playlist.playlistIdentifier);
                    close();
                  }}
                >
                  <span className="block break-words">{playlist.name}</span>
                  {playlist.reason ? (
                    <span
                      id={`${chooserId}-${playlist.playlistIdentifier}-reason`}
                      className="block text-xs font-normal text-text-muted"
                    >
                      {playlist.reason}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={button} onClick={close}>
            {t.close}
          </button>
        </dialog>
      ) : null}
    </li>
  );
}
