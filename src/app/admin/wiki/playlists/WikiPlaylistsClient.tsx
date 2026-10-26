"use client";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import {
  useYouTubePlayback,
  PlaybackOutlet,
} from "@/components/YouTubePlayback/YouTubePlaybackProvider";
import { useWikiPlaylists } from "@/gateways/wiki/useWikiPlaylists";
import {
  playlistItemKey,
  playlistName,
  type Playlist,
} from "@/gateways/wiki/wikiPlaylists";
import { useAuthStore } from "@/gateways/auth/authStore";
import type { I18nDictionary } from "@/i18n/dictionaries";
import { useI18n } from "@/i18n/I18nProvider";
import { useWikiSection } from "../WikiSectionProvider";

type Text = I18nDictionary["admin"]["playlists"];
type PlaybackText = I18nDictionary["wiki"]["videos"]["continuous"];
const button =
  "rounded-lg border border-stroke-subtle px-3 py-2 text-sm font-semibold hover:bg-surface-muted aria-pressed:border-brand-primary aria-pressed:bg-brand-highlight/30 focus-visible:outline-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50";
const input =
  "min-w-0 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2";
export function WikiPlaylistsClient() {
  const { principalState } = useWikiSection();
  const { dictionary } = useI18n();
  const auth = useAuthStore();
  const needsAuthentication =
    auth.status === "loading" && auth.sessionVersion === 0 && !auth.identity;
  const refreshIdentity = auth.refreshIdentity;
  useEffect(() => {
    if (needsAuthentication) void refreshIdentity();
  }, [needsAuthentication, refreshIdentity]);
  if (
    principalState.status !== "available" ||
    principalState.principal.status !== "active" ||
    auth.status !== "authenticated"
  )
    return null;
  const scope = [
    principalState.principal.principalIdentifier,
    auth.identity?.identityIdentifier,
    auth.identity?.accountIdentifier,
    auth.identity?.accountPrincipalIdentifier,
    auth.sessionVersion,
  ].join(":");
  return (
    <PlaylistWorkspace
      key={scope}
      principal={scope}
      t={dictionary.admin.playlists}
      playbackText={dictionary.wiki.videos.continuous}
    />
  );
}
const errorText = (status: number, t: Text) =>
  status === 401 || status === 419
    ? t.unauthorized
    : status === 403
      ? t.forbidden
      : status === 404
        ? t.notFound
        : status === 409
          ? t.conflict
          : status === 422
            ? t.invalid
            : status === 50
              ? t.tooMany
              : t.failed;
export function PlaylistWorkspace({
  principal,
  t,
  playbackText,
}: {
  principal: string;
  t: Text;
  playbackText: PlaybackText;
}) {
  const state = useWikiPlaylists(principal);
  const [newName, setNewName] = useState("");
  const [target, setTarget] = useState("");
  const { detail, draft, busy } = state;
  const locked = busy || state.committed;
  const lists = state.list.data?.playlists ?? [];
  const move = (index: number, offset: number) => {
    if (!draft) return;
    const items = [...draft.items];
    [items[index], items[index + offset]] = [
      items[index + offset],
      items[index],
    ];
    state.setDraft({ ...draft, items });
  };
  return (
    <section className="space-y-6" aria-label={t.title}>
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <p className="text-sm text-text-muted">{t.limit}</p>
      {state.error !== null ? (
        <p role="alert">{errorText(state.error, t)}</p>
      ) : null}
      {state.notice ? <p role="status">{t[state.notice]}</p> : null}
      {busy ? <p role="status">{t.loading}</p> : null}
      {state.committed ? (
        <div className="flex gap-3">
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => void state.refreshSaved()}
          >
            {t.retry}
          </button>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={state.close}
          >
            {t.close}
          </button>
        </div>
      ) : null}
      {!draft && !state.committed ? (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void state.create(newName);
          }}
        >
          <label className="grid gap-2">
            {t.newName}
            <input
              className={input}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              aria-describedby="playlist-name-rule"
              disabled={busy}
            />
          </label>
          <button
            className={button}
            disabled={
              busy ||
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
      ) : null}
      <div className="space-y-3">
        <button
          type="button"
          className={button}
          disabled={busy || state.list.isFetching}
          onClick={() => void state.list.refetch()}
        >
          {t.retry}
        </button>
        {state.list.isPending ? (
          <p role="status">{t.loading}</p>
        ) : state.list.isError ? (
          <p role="alert">
            {errorText(
              typeof state.list.error === "object" &&
                "status" in state.list.error
                ? Number(state.list.error.status)
                : 0,
              t,
            )}
          </p>
        ) : lists.length === 0 ? (
          <p>{t.empty}</p>
        ) : null}
        <ul className="flex flex-wrap gap-3">
          {lists.map((list) => (
            <li
              key={list.playlistIdentifier}
              className="rounded-xl border border-stroke-subtle p-3"
            >
              <button
                type="button"
                className={button}
                disabled={busy || !!draft || state.committed}
                onClick={() => void state.open(list.playlistIdentifier)}
              >
                {list.name}
              </button>
              <span className="ml-3">{list.videoCount}/50</span>
            </li>
          ))}
        </ul>
      </div>
      {detail ? (
        <section
          aria-label={detail.name}
          className="space-y-4 rounded-xl border border-stroke-subtle bg-surface-raised p-4"
        >
          <h3 className="break-words text-lg font-semibold">{detail.name}</h3>
          {draft ? (
            <>
              <p className="text-sm text-text-muted">{t.draftHint}</p>
              <label className="grid gap-2">
                {t.name}
                <input
                  className={input}
                  value={draft.name}
                  disabled={locked}
                  onChange={(event) =>
                    state.setDraft({ ...draft, name: event.target.value })
                  }
                />
              </label>
              {!playlistName.safeParse(draft.name).success ? (
                <p role="status">{t.nameRule}</p>
              ) : null}
              <p>{draft.items.length}/50</p>
              <ol className="space-y-2">
                {draft.items.map((item, index) => (
                  <li
                    key={playlistItemKey(item)}
                    className="flex flex-wrap items-center gap-2 border-b border-stroke-subtle py-2"
                  >
                    <span className="min-w-0 flex-1 break-words">
                      {item.title}
                    </span>
                    <button
                      type="button"
                      className={button}
                      aria-label={`${t.up}: ${item.title}`}
                      disabled={locked || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      {t.up}
                    </button>
                    <button
                      type="button"
                      className={button}
                      aria-label={`${t.down}: ${item.title}`}
                      disabled={locked || index === draft.items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      {t.down}
                    </button>
                    <button
                      type="button"
                      className={button}
                      aria-label={`${t.remove}: ${item.title}`}
                      disabled={locked}
                      onClick={() =>
                        state.setDraft({
                          ...draft,
                          items: draft.items.filter((_, i) => i !== index),
                        })
                      }
                    >
                      {t.remove}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="flex gap-3">
                <button
                  type="button"
                  className={button}
                  disabled={
                    locked || !playlistName.safeParse(draft.name).success
                  }
                  onClick={() => void state.save()}
                >
                  {t.save}
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={locked}
                  onClick={state.cancel}
                >
                  {t.cancel}
                </button>
              </div>
            </>
          ) : (
            <>
              {!detail.items.length ? (
                <p>{t.noVideos}</p>
              ) : (
                <ol className="space-y-2">
                  {[...detail.items]
                    .sort((a, b) => a.position - b.position)
                    .map((item) => (
                      <li key={playlistItemKey(item)} className="break-words">
                        {item.title}
                        {item.sourceVideoLinkIdentifier === null ? (
                          <span className="ml-2 text-sm text-text-muted">
                            {t.deletedSource}
                          </span>
                        ) : null}
                      </li>
                    ))}
                </ol>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={button}
                  disabled={locked}
                  onClick={state.edit}
                >
                  {t.edit}
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={locked}
                  onClick={() => {
                    if (window.confirm(t.confirmDelete)) void state.remove();
                  }}
                >
                  {t.delete}
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={state.close}
                >
                  {t.close}
                </button>
              </div>
            </>
          )}
          {!state.committed ? (
            <SavedPlaylistPlayback
              detail={detail}
              principal={principal}
              t={t}
              playbackText={playbackText}
            />
          ) : null}
        </section>
      ) : null}
      <section aria-label={t.likes} className="space-y-4">
        <h3 className="text-lg font-semibold">{t.likes}</h3>
        {!draft ? (
          <label className="grid max-w-md gap-2">
            {t.target}
            <select
              className={input}
              value={target}
              disabled={locked}
              onChange={(event) => setTarget(event.target.value)}
            >
              <option value="">{t.choose}</option>
              {lists.map((list) => (
                <option
                  key={list.playlistIdentifier}
                  value={list.playlistIdentifier}
                >
                  {list.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className={button}
          disabled={state.likes.isFetching}
          onClick={() => void state.likes.refetch()}
        >
          {t.retry}
        </button>
        {state.likes.isPending ? <p role="status">{t.loading}</p> : null}
        {state.likes.isError ? (
          <p role="alert">
            {errorText(
              typeof state.likes.error === "object" &&
                "status" in state.likes.error
                ? Number(state.likes.error.status)
                : 0,
              t,
            )}
          </p>
        ) : null}
        {state.likes.isSuccess ? (
          <p className="text-sm text-text-muted">
            {t.sourceCount}: {state.likes.data.pages[0].pagination.total}
          </p>
        ) : null}
        {state.likes.isSuccess && !state.videos.length ? (
          <p>{t.noVideos}</p>
        ) : null}
        <ul className="grid gap-3 sm:grid-cols-2">
          {state.videos.map((video) => (
            <li
              key={video.externalVideoId}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-stroke-subtle p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="break-words">{video.title}</p>
                <p className="text-sm text-text-muted">
                  {video.language} · {video.resourceType}
                </p>
              </div>
              <button
                type="button"
                className={button}
                aria-label={`${t.add}: ${video.title}`}
                disabled={
                  locked ||
                  (draft
                    ? draft.items.length >= 50 ||
                      draft.items.some(
                        (item) =>
                          item.externalVideoId === video.externalVideoId,
                      )
                    : !lists.some((list) => list.playlistIdentifier === target))
                }
                onClick={() =>
                  draft ? state.add(video) : void state.open(target, video)
                }
              >
                {t.add}
              </button>
            </li>
          ))}
        </ul>
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
    </section>
  );
}
function SavedPlaylistPlayback({
  detail,
  principal,
  t,
  playbackText,
}: {
  detail: Playlist;
  principal: string;
  t: Text;
  playbackText: PlaybackText;
}) {
  const context = useYouTubePlayback();
  if (!context) return null;
  return (
    <ConnectedPlaylistPlayback
      detail={detail}
      principal={principal}
      t={t}
      playbackText={playbackText}
      store={context.store}
    />
  );
}
function ConnectedPlaylistPlayback({
  detail,
  principal,
  t,
  playbackText,
  store,
}: {
  detail: Playlist;
  principal: string;
  t: Text;
  playbackText: PlaybackText;
  store: NonNullable<ReturnType<typeof useYouTubePlayback>>["store"];
}) {
  const owner = `private-playlist:${principal}:${detail.playlistIdentifier}`;
  const session = useStore(store, (state) => state.session);
  const notice = useStore(store, (state) => state.notice);
  const [random, setRandom] = useState(false),
    [loop, setLoop] = useState(false);
  const active = session?.owner === owner;
  useEffect(() => () => store.getState().release(owner), [store, owner]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={button}
          disabled={!detail.items.length}
          onClick={() =>
            store.getState().start(
              owner,
              [...detail.items]
                .sort((a, b) => a.position - b.position)
                .map((item) => ({
                  identifier: playlistItemKey(item),
                  videoId: item.externalVideoId,
                  title: item.title,
                })),
              "queue",
              loop,
              random,
            )
          }
        >
          {t.play}
        </button>
        <button
          type="button"
          className={button}
          aria-pressed={active ? session.random : random}
          onClick={() => {
            const value = !(active ? session.random : random);
            setRandom(value);
            if (active) store.getState().setRandom(value);
          }}
        >
          {playbackText.random}
        </button>
        <button
          type="button"
          className={button}
          aria-pressed={active ? session.loop : loop}
          onClick={() => {
            const value = !(active ? session.loop : loop);
            setLoop(value);
            if (active) store.getState().setLoop(value);
          }}
        >
          {playbackText.loop}
        </button>
      </div>
      {notice?.owner === owner && !notice.floating ? (
        <p role="status">{playbackText[notice.kind]}</p>
      ) : null}
      <PlaybackOutlet owner={owner} />
    </div>
  );
}
