"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/gateways/auth/authStore";
import {
  fetchWikiVideoLikeAccess,
  fetchWikiVideoLikes,
  setWikiVideoLiked,
} from "./wikiVideoLikes";
import type { WikiVideo, WikiVideoIdentity } from "./wikiVideos";

const currentSessionKey = () => {
  const { status, identity, sessionVersion } = useAuthStore.getState();
  return [
    status,
    identity?.identityIdentifier,
    identity?.accountIdentifier,
    identity?.accountPrincipalIdentifier,
    sessionVersion,
  ].join(":");
};
type Operation = {
  liked: boolean;
  count: number;
  pending: boolean;
  failed: boolean;
};
type Operations = Record<string, Operation | undefined>;

export function useWikiVideoLikes(
  identity: WikiVideoIdentity,
  videos: WikiVideo[],
  sessionKey: string,
) {
  const client = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const access = useQuery({
    queryKey: ["wiki-video-like-access", sessionKey, identity.resourceType],
    queryFn: ({ signal }) =>
      fetchWikiVideoLikeAccess(identity.resourceType, signal),
    enabled: status === "authenticated",
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const ids = videos.map((video) => video.videoLinkIdentifier).sort();
  const personalPrefix = ["wiki-video-likes", sessionKey];
  const personal = useQuery({
    queryKey: [...personalPrefix, ids],
    queryFn: ({ signal }) => fetchWikiVideoLikes(ids, signal),
    enabled:
      status === "authenticated" &&
      !!access.data?.principalIdentifier &&
      ids.length > 0,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const publicPrefix = [
    "public-wiki-videos",
    identity.language,
    identity.resourceType,
    identity.slug,
  ];
  const operationsKey = [
    "wiki-video-like-operations",
    sessionKey,
    ...publicPrefix.slice(1),
  ];
  // A shared, session-scoped overlay keeps pending work coherent across filter remounts
  // without writing an uncommitted user's delta into anonymous/public list caches.
  const operations = useQuery<Operations>({
    queryKey: operationsKey,
    queryFn: () => ({}),
    enabled: false,
    initialData: {},
    staleTime: Infinity,
  });
  const writeOperation = (id: string, value: Operation | undefined) =>
    client.setQueryData<Operations>(operationsKey, (previous) => ({
      ...previous,
      [id]: value,
    }));
  const toggle = async (video: WikiVideo) => {
    const id = video.videoLinkIdentifier;
    if (
      currentSessionKey() !== sessionKey ||
      status !== "authenticated" ||
      !personal.isSuccess ||
      access.isFetching ||
      personal.isFetching
    )
      return;
    if (client.getQueryData<Operations>(operationsKey)?.[id]?.pending) return;
    const liked = !personal.data.includes(id);
    if (!(liked ? access.data?.canLike : access.data?.canUnlike)) return;
    const count = Math.max(0, video.likeCount + (liked ? 1 : -1));
    writeOperation(id, { liked, count, pending: true, failed: false });
    const controller = new AbortController();
    let current = true;
    const unsubscribe = useAuthStore.subscribe(() => {
      if (currentSessionKey() !== sessionKey) {
        current = false;
        controller.abort();
        writeOperation(id, undefined);
        unsubscribe();
      }
    });
    await client.cancelQueries({ queryKey: publicPrefix });
    await client.cancelQueries({ queryKey: personalPrefix });
    if (!current || currentSessionKey() !== sessionKey) {
      unsubscribe();
      return;
    }
    const result = await setWikiVideoLiked(id, liked, controller.signal);
    unsubscribe();
    // Late completions may not touch the next user's caches or public counts.
    if (!current || currentSessionKey() !== sessionKey) return;
    if (result.ok) {
      client.setQueriesData<{ videos: WikiVideo[] }>(
        { queryKey: publicPrefix },
        (data) =>
          data
            ? {
                ...data,
                videos: data.videos.map((item) =>
                  item.videoLinkIdentifier === id
                    ? { ...item, likeCount: count }
                    : item,
                ),
              }
            : data,
      );
      client.setQueriesData<string[]>(
        {
          queryKey: personalPrefix,
          predicate: (query) =>
            Array.isArray(query.queryKey[2]) && query.queryKey[2].includes(id),
        },
        (data) =>
          data
            ? [...data.filter((item) => item !== id), ...(liked ? [id] : [])]
            : data,
      );
      writeOperation(id, undefined);
    } else
      writeOperation(id, {
        liked: !liked,
        count: video.likeCount,
        pending: false,
        failed: true,
      });
  };
  return {
    state: (video: WikiVideo) => {
      const operation =
        status === "authenticated"
          ? operations.data?.[video.videoLinkIdentifier]
          : undefined;
      const known =
        status === "authenticated" &&
        personal.isSuccess &&
        !personal.isFetching;
      const liked = known
        ? operation?.pending
          ? operation.liked
          : personal.data.includes(video.videoLinkIdentifier)
        : undefined;
      return {
        liked,
        count: operation?.pending ? operation.count : video.likeCount,
        disabled:
          !known ||
          access.isFetching ||
          !!operation?.pending ||
          !(liked ? access.data?.canUnlike : access.data?.canLike),
        failed: !!operation?.failed,
      };
    },
    loading:
      status === "authenticated" &&
      (access.isPending ||
        (!!access.data?.principalIdentifier &&
          personal.isPending &&
          ids.length > 0)),
    error: status === "authenticated" && (access.isError || personal.isError),
    retry: () => {
      if (access.isError) void access.refetch();
      else void personal.refetch();
    },
    toggle,
  };
}
