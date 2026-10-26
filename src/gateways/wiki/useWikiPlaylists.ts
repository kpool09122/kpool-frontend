"use client";
import { useEffect, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthStore } from "@/gateways/auth/authStore";
import {
  aggregateLikedVideos,
  createPlaylist,
  deletePlaylist,
  fetchLikedVideoPage,
  fetchPlaylist,
  fetchPlaylists,
  playlistName,
  savePlaylist,
  type Playlist,
  type LikedVideo,
} from "./wikiPlaylists";
import { getYouTubeVideoId } from "@kpool/wiki";

export type PlaylistDraftItem = {
  provider: "youtube";
  externalVideoId: string;
  title: string;
  videoLinkIdentifier?: string;
};
export type PlaylistDraft = { name: string; items: PlaylistDraftItem[] };
export const playlistToDraft = (data: Playlist): PlaylistDraft => ({
  name: data.name,
  items: [...data.items]
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      provider: item.provider,
      externalVideoId: item.externalVideoId,
      title: item.title,
    })),
});

export const playlistSessionKey = () => {
  const { status, identity, sessionVersion } = useAuthStore.getState();
  return [
    status,
    identity?.identityIdentifier,
    identity?.accountIdentifier,
    identity?.accountPrincipalIdentifier,
    sessionVersion,
  ].join(":");
};
const statusOf = (error: unknown) =>
  typeof error === "object" &&
  error &&
  "status" in error &&
  typeof error.status === "number"
    ? error.status
    : 0;
/** Use inside a workspace keyed by the authenticated Principal and session. */
export function useWikiPlaylists(principal: string) {
  const auth = useAuthStore();
  const session = playlistSessionKey();
  const scope = `${session}:${principal}`;
  const client = useQueryClient();
  const prefix = ["private-wiki-playlists", scope];
  const likesKey = ["private-wiki-playlist-likes", scope];
  const [detail, setDetail] = useState<Playlist | null>(null);
  const [draft, setDraft] = useState<PlaylistDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<number | null>(null);
  const [notice, setNotice] = useState<
    | "saved"
    | "created"
    | "deleted"
    | "savedRefreshFailed"
    | "deletedRefreshFailed"
    | "createdRefreshFailed"
    | null
  >(null);
  const [committed, setCommitted] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
    },
    [],
  );
  const list = useQuery({
    queryKey: prefix,
    queryFn: ({ signal }) => fetchPlaylists(signal),
    enabled: auth.status === "authenticated",
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
  const likes = useInfiniteQuery({
    queryKey: likesKey,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => fetchLikedVideoPage(pageParam, signal),
    getNextPageParam: (last) =>
      last.pagination.currentPage * last.pagination.perPage <
      last.pagination.total
        ? last.pagination.currentPage + 1
        : undefined,
    enabled: auth.status === "authenticated",
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
  const begin = () => {
    if (pending.current || playlistSessionKey() !== session) return null;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError(null);
    setNotice(null);
    return {
      controller,
      current: () =>
        !controller.signal.aborted &&
        playlistSessionKey() === session,
    };
  };
  const finish = (op: NonNullable<ReturnType<typeof begin>>) => {
    if (pending.current === op.controller) pending.current = null;
    if (op.current()) setBusy(false);
  };
  const refreshList = () =>
    client.fetchQuery({
      queryKey: prefix,
      queryFn: ({ signal }) => fetchPlaylists(signal),
      staleTime: 0,
    });
  const open = async (id: string) => {
    const op = begin();
    if (!op) return;
    try {
      const data = await fetchPlaylist(id, op.controller.signal);
      if (!op.current()) return;
      setDetail(data);
      setCommitted(false);
      setDraft(null);
    } catch (e) {
      if (op.current()) setError(statusOf(e));
    } finally {
      finish(op);
    }
  };
  const refreshSaved = async () => {
    if (!detail || !committed) return;
    const op = begin();
    if (!op) return;
    try {
      const data = await fetchPlaylist(
        detail.playlistIdentifier,
        op.controller.signal,
      );
      await refreshList();
      if (op.current()) {
        setDetail(data);
        setDraft(null);
        setCommitted(false);
        setNotice("saved");
      }
    } catch (e) {
      if (op.current()) {
        setError(statusOf(e));
        setNotice("savedRefreshFailed");
      }
    } finally {
      finish(op);
    }
  };
  const persistPlaylist = async (
    op: NonNullable<ReturnType<typeof begin>>,
    playlist: Playlist,
    next: PlaylistDraft,
  ) => {
    const result = await savePlaylist(
      playlist.playlistIdentifier,
      {
        name: next.name,
        items: next.items.map((item) =>
          item.videoLinkIdentifier
            ? { videoLinkIdentifier: item.videoLinkIdentifier }
            : { provider: item.provider, externalVideoId: item.externalVideoId },
        ),
      },
      op.controller.signal,
    );
    if (!op.current()) return;
    if (!result.ok) {
      setError(result.status);
      return;
    }
    setDetail(playlist);
    setCommitted(true);
    void client.invalidateQueries({ queryKey: likesKey });
    try {
      const data = await fetchPlaylist(playlist.playlistIdentifier, op.controller.signal);
      await refreshList();
      if (op.current()) {
        setDetail(data);
        setDraft(null);
        setCommitted(false);
        setNotice("saved");
      }
    } catch (e) {
      if (op.current()) {
        setError(statusOf(e));
        setNotice("savedRefreshFailed");
      }
    }
  };
  const save = async () => {
    if (!detail || !draft || committed) return;
    const name = playlistName.safeParse(draft.name);
    if (!name.success) {
      setError(422);
      return;
    }
    const op = begin();
    if (!op) return;
    try {
      await persistPlaylist(op, detail, { ...draft, name: name.data });
    } finally {
      finish(op);
    }
  };
  const addToPlaylist = async (identifier: string, video: LikedVideo) => {
    if (committed || (draft && detail?.playlistIdentifier !== identifier)) return;
    const op = begin();
    if (!op) return;
    try {
      const playlist = draft && detail
        ? detail
        : await fetchPlaylist(identifier, op.controller.signal);
      if (!op.current()) return;
      const next = draft ? { ...draft, items: [...draft.items] } : playlistToDraft(playlist);
      const externalVideoId = getYouTubeVideoId(video.url);
      if (!externalVideoId || next.items.some((item) => item.externalVideoId === externalVideoId)) {
        setError(422);
        return;
      }
      if (next.items.length >= 50) {
        setError(50);
        return;
      }
      next.items.push({ provider: "youtube", externalVideoId, title: video.title, videoLinkIdentifier: video.videoLinkIdentifier });
      setDetail(playlist);
      setDraft(next);
    } catch (e) {
      if (op.current()) setError(statusOf(e));
    } finally {
      finish(op);
    }
  };
  const create = async (name: string) => {
    const parsed = playlistName.safeParse(name);
    if (!parsed.success) {
      setError(422);
      return;
    }
    const op = begin();
    if (!op) return;
    const result = await createPlaylist(parsed.data, op.controller.signal);
    if (!op.current()) {
      finish(op);
      return;
    }
    if (!result.ok) {
      setError(result.status);
      finish(op);
      return;
    }
    // Creation is committed independently; never recreate on a later save failure.
    const data = { ...result.data, items: [] };
    setDetail(data);
    setDraft(null);
    setCommitted(false);
    setNotice("created");
    try {
      await refreshList();
    } catch (e) {
      if (op.current()) {
        setError(statusOf(e));
        setNotice("createdRefreshFailed");
      }
    } finally {
      finish(op);
    }
  };
  const remove = async () => {
    if (!detail) return;
    const op = begin();
    if (!op) return;
    const result = await deletePlaylist(
      detail.playlistIdentifier,
      op.controller.signal,
    );
    if (!op.current()) {
      finish(op);
      return;
    }
    if (!result.ok) {
      setError(result.status);
      finish(op);
      return;
    }
    setDetail(null);
    setDraft(null);
    setCommitted(false);
    setNotice("deleted");
    void client.invalidateQueries({ queryKey: likesKey });
    try {
      await refreshList();
    } catch (e) {
      if (op.current()) {
        setError(statusOf(e));
        setNotice("deletedRefreshFailed");
      }
    } finally {
      finish(op);
    }
  };
  const hasUnsavedChanges = detail !== null && draft !== null &&
    JSON.stringify(draft) !== JSON.stringify(playlistToDraft(detail));
  const visible = auth.status === "authenticated";
  return {
    list,
    likes,
    videos: visible
      ? aggregateLikedVideos(
          likes.data?.pages.flatMap((page) => page.videos) ?? [],
        )
      : [],
    detail: visible ? detail : null,
    draft: visible ? draft : null,
    hasUnsavedChanges: visible && hasUnsavedChanges,
    setDraft: (next: PlaylistDraft | null) => {
      if (busy || committed) return;
      setDraft(next && detail && JSON.stringify(next) === JSON.stringify(playlistToDraft(detail)) ? null : next);
    },
    busy,
    error,
    notice,
    committed,
    open,
    create,
    save,
    remove,
    refreshSaved,
    addToPlaylist,
    clearFeedback: () => {
      if (!busy && !committed) {
        setError(null);
        setNotice(null);
      }
    },
    edit: () => {
      if (detail && !busy) {
        setDraft(playlistToDraft(detail));
        setNotice(null);
        setError(null);
      }
    },
    cancel: () => {
      if (!busy && !committed) {
        setDraft(null);
        setError(null);
        setNotice(null);
      }
    },
    close: () => {
      if (!busy) {
        setDetail(null);
        setDraft(null);
        setCommitted(false);
        setError(null);
        setNotice(null);
      }
    },
  };
}
