"use client";

import { useState } from "react";
import { playlistToDraft } from "@/gateways/wiki/useWikiPlaylists";
import { playlistItemKey, playlistName } from "@/gateways/wiki/wikiPlaylists";
import { LikedVideoRow } from "./LikedVideoRow";
import { PlaylistActions } from "./PlaylistActions";
import { SavedPlaylistPlayback } from "./SavedPlaylistPlayback";
import { PlaylistEditor, PlaylistSaveButton } from "./PlaylistEditor";
import { button, input, type Text, type PlaybackText, type PlaylistState } from "./playlistUi";

export function PlaylistCreatePanel({ state, t }: { state: PlaylistState; t: Text }) {
  const [newName, setNewName] = useState("");
  const { draft } = state;
  const locked = state.busy || state.committed;
  const lists = state.list.data?.playlists ?? [];
  return (
    <section className="space-y-4" aria-label={t.createTitle}>
      <h3 className="font-semibold text-text-strong">{t.createTitle}</h3>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft && !locked) void state.create(newName);
        }}
      >
        <label className="grid gap-2">
          <span className="sr-only">{t.newName}</span>
          <input
            placeholder={t.newName}
            className={input}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            aria-describedby="playlist-name-rule"
            disabled={locked || !!draft}
          />
        </label>
        <button
          className={button}
          disabled={
            locked ||
            !!draft ||
            !state.list.isSuccess ||
            lists.length >= 3 ||
            !playlistName.safeParse(newName).success
          }
        >
          {t.create}
        </button>
        <p id="playlist-name-rule" className="w-full text-sm text-text-muted">
          {t.nameRule}
        </p>
      </form>
    </section>
  );
}

export function PlaylistListPanel({ state, principal, t, playbackText }: {
  state: PlaylistState; principal: string; t: Text; playbackText: PlaybackText;
}) {
  const { detail, busy } = state;
  const lists = state.list.data?.playlists ?? [];
  return (
    <div className="space-y-5">
      {state.list.isSuccess && !lists.length ? <p>{t.empty}</p> : null}
      {lists.length ? (
        <div className="flex max-w-full items-end gap-2 sm:max-w-md">
          <label className="grid min-w-0 flex-1 gap-2 text-sm font-semibold text-text-strong">
            {t.selectPlaylist}
            <select className={`${input} w-full`}
              value={detail?.playlistIdentifier ?? ""} disabled={busy || state.committed}
              onChange={(event) => {
                if (event.target.value === detail?.playlistIdentifier) return;
                if (state.hasUnsavedChanges && !window.confirm(t.discardChanges)) return;
                if (event.target.value) void state.open(event.target.value);
                else state.close();
              }}>
              <option value="">{t.choose}</option>
              {lists.map((list) => <option key={list.playlistIdentifier} value={list.playlistIdentifier}>{list.name}</option>)}
            </select>
          </label>
          <PlaylistActions key={detail?.playlistIdentifier ?? "unselected"} state={state} t={t} />
        </div>
      ) : null}
      {detail ? (
        <section aria-label={detail.name} className="border-t border-stroke-subtle pt-4">
          <SavedPlaylistPlayback detail={detail} principal={principal} playbackText={playbackText}
            tracks={(state.draft ?? playlistToDraft(detail)).items.map((item) => ({
              identifier: playlistItemKey(item), videoId: item.externalVideoId, provider: item.provider, title: item.title,
            }))}
            editor={(playback, onSelect) => (
              <PlaylistEditor state={state} t={t} playbackText={playbackText} playback={playback} onSelect={onSelect} />
            )}
          />
        </section>
      ) : null}
    </div>
  );
}

export function PlaylistEditPanel({ state, t }: { state: PlaylistState; t: Text }) {
  const locked = state.busy || state.committed;
  const lists = state.list.data?.playlists ?? [];
  return (
    <section aria-label={t.likes} className="space-y-4">
      <h3 className="text-lg font-semibold">{t.likes}</h3>
      {state.likes.isSuccess && !state.videos.length ? (
        <p>{t.noVideos}</p>
      ) : null}
      <ul className="divide-y divide-stroke-subtle">
        {state.videos.map((video) => (
          <LikedVideoRow
            key={playlistItemKey(video)}
            video={video}
            disabled={locked || !state.list.isSuccess}
            playlists={lists.map((list) => {
              const editing = state.detail?.playlistIdentifier === list.playlistIdentifier;
              const count = editing && state.draft ? state.draft.items.length : list.videoCount;
              const included = editing && state.detail
                ? (state.draft ?? state.detail).items.some((item) => playlistItemKey(item) === playlistItemKey(video))
                : video.playlists.some((playlist) => playlist.playlistIdentifier === list.playlistIdentifier);
              const reason = state.hasUnsavedChanges && !editing ? t.finishEditing
                : included ? t.alreadyAdded
                  : count >= 50 ? t.tooMany : null;
              return { ...list, reason, included };
            })}
            onSelect={(identifier) => void state.addToPlaylist(identifier, video)}
            t={t}
          />
        ))}
      </ul>
      {state.hasUnsavedChanges ? <p className="text-sm text-text-muted">{t.draftHint}</p> : null}
      {state.detail ? <PlaylistSaveButton state={state} t={t} /> : null}
      {state.likes.hasNextPage ? (
        <button
          type="button"
          className={button}
          disabled={state.likes.isFetching}
          onClick={() => void state.likes.fetchNextPage()}
        >
          {t.more}
        </button>
      ) : null}
    </section>
  );
}
