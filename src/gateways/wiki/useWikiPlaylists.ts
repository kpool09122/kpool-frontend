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
  playlistItemKey,
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
export function useWikiPlaylists(principal: string) {
  const auth = useAuthStore();
  const session = playlistSessionKey();
  const scope = `${session}:${principal}`;
  const client = useQueryClient();
  const prefix = ["private-wiki-playlists", scope];
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
  const liveScope = useRef(scope);
  useEffect(() => {
    liveScope.current = scope;
  }, [scope]);
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
    queryKey: ["private-wiki-playlist-likes", scope],
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
        liveScope.current === scope &&
        `${playlistSessionKey()}:${principal}` === scope,
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
  const toDraft = (data: Playlist): PlaylistDraft => ({
    name: data.name,
    items: [...data.items]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        provider: item.provider,
        externalVideoId: item.externalVideoId,
        title: item.title,
      })),
  });
  const open = async (id: string, add?: LikedVideo) => {
    const op = begin();
    if (!op) return;
    try {
      const data = await fetchPlaylist(id, op.controller.signal);
      if (!op.current()) return;
      setDetail(data);
      setCommitted(false);
      if (add) {
        const next = toDraft(data);
        const externalVideoId = getYouTubeVideoId(add.url);
        if (
          externalVideoId &&
          !next.items.some(
            (item) => item.externalVideoId === externalVideoId,
          ) &&
          next.items.length < 50
        )
          next.items.push({
            provider: "youtube",
            externalVideoId,
            title: add.title,
            videoLinkIdentifier: add.videoLinkIdentifier,
          });
        else setError(next.items.length >= 50 ? 50 : 422);
        setDraft(next);
      } else setDraft(null);
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
  const save = async () => {
    if (!detail || !draft || committed) return;
    const name = playlistName.safeParse(draft.name);
    if (!name.success) {
      setError(422);
      return;
    }
    const op = begin();
    if (!op) return;
    const result = await savePlaylist(
      detail.playlistIdentifier,
      {
        name: name.data,
        items: draft.items.map((item) =>
          item.videoLinkIdentifier
            ? { videoLinkIdentifier: item.videoLinkIdentifier }
            : {
                provider: item.provider,
                externalVideoId: item.externalVideoId,
              },
        ),
      },
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
    setCommitted(true);
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
    setDraft(toDraft(data));
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
  const add = (video: LikedVideo) => {
    if (!draft || busy || committed) return;
    const externalVideoId = getYouTubeVideoId(video.url);
    if (!externalVideoId) return;
    if (
      draft.items.some(
        (item) => playlistItemKey(item) === `youtube:${externalVideoId}`,
      )
    ) {
      setError(422);
      return;
    }
    if (draft.items.length >= 50) {
      setError(50);
      return;
    }
    setDraft({
      ...draft,
      items: [
        ...draft.items,
        {
          provider: "youtube",
          externalVideoId,
          title: video.title,
          videoLinkIdentifier: video.videoLinkIdentifier,
        },
      ],
    });
  };
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
    setDraft,
    busy,
    error,
    notice,
    committed,
    open,
    create,
    save,
    remove,
    refreshSaved,
    add,
    edit: () => {
      if (detail && !busy) {
        setDraft(toDraft(detail));
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
