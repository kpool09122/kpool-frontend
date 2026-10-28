"use client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useIsMutating,
} from "@tanstack/react-query";
import { useAuthStore } from "@/gateways/auth/authStore";
import {
  fetchWikiVideoWatchRequests,
  sendWikiVideoWatchRequest,
} from "./wikiVideoWatchRequests";
import type { WikiVideo, WikiVideoIdentity } from "./wikiVideos";

export const wikiVideoSessionKey = () => {
  const state = useAuthStore.getState();
  return [
    state.status,
    state.identity?.identityIdentifier,
    state.identity?.accountIdentifier,
    state.identity?.accountPrincipalIdentifier,
    state.sessionVersion,
  ].join(":");
};
export function useWikiVideoWatchRequests(
  identity: WikiVideoIdentity,
  videos: WikiVideo[],
  sessionKey: string,
) {
  const client = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const ids = [
    ...new Set(videos.map((video) => video.videoLinkIdentifier)),
  ].sort();
  const relevant = identity.resourceType === "talent";
  const prefix = ["wiki-video-watch-requests", sessionKey];
  const query = useQuery({
    queryKey: [...prefix, ids],
    queryFn: ({ signal }) => fetchWikiVideoWatchRequests(ids, signal),
    enabled: relevant && status === "authenticated" && ids.length > 0,
    gcTime: relevant ? 0 : Infinity,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    // Expiry is server-authoritative; never unlock based on the browser clock.
    refetchInterval:
      relevant && status === "authenticated" && ids.length > 0 ? 60_000 : false,
  });
  const mutationKey = [
    "send-wiki-video-watch-request",
    sessionKey,
    identity.language,
    identity.resourceType,
    identity.slug,
  ];
  const pending = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    mutationFn: async (id: string) => {
      if (wikiVideoSessionKey() !== sessionKey)
        return { ok: false, status: 401 };
      const controller = new AbortController();
      const unsubscribe = useAuthStore.subscribe(() => {
        if (wikiVideoSessionKey() !== sessionKey) controller.abort();
      });
      const result = await sendWikiVideoWatchRequest(id, controller.signal);
      unsubscribe();
      return result;
    },
    onSettled: async () => {
      if (wikiVideoSessionKey() !== sessionKey) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: prefix }),
        client.invalidateQueries({
          queryKey: ["wiki-video-likes", sessionKey],
        }),
        client.invalidateQueries({
          queryKey: [
            "public-wiki-videos",
            identity.language,
            identity.resourceType,
            identity.slug,
          ],
        }),
      ]);
    },
  });
  const known =
    relevant &&
    status === "authenticated" &&
    query.isSuccess &&
    !query.isFetching;
  return {
    enabled: relevant && status === "authenticated",
    loading:
      relevant &&
      status === "authenticated" &&
      query.isPending &&
      ids.length > 0,
    error: relevant && status === "authenticated" && query.isError,
    retry: () => void query.refetch(),
    state: (video: WikiVideo) =>
      known
        ? query.data.find(
            (item) => item.videoLinkIdentifier === video.videoLinkIdentifier,
          )
        : undefined,
    unlikeBlocked: (video: WikiVideo) =>
      relevant &&
      status === "authenticated" &&
      (!known ||
        !!query.data?.find(
          (item) => item.videoLinkIdentifier === video.videoLinkIdentifier,
        )?.unlikeRestrictedUntil),
    pending,
    failed: mutation.data?.ok === false && wikiVideoSessionKey() === sessionKey,
    status: mutation.data?.status,
    send: (video: WikiVideo) => {
      if (
        !known ||
        !query.data.find(
          (item) => item.videoLinkIdentifier === video.videoLinkIdentifier,
        )?.canSend ||
        client.isMutating({ mutationKey }) ||
        wikiVideoSessionKey() !== sessionKey ||
        video.videoUsage.startsWith("youtube_auto_") ||
        video.durationSeconds === null ||
        video.durationSeconds > 30
      )
        return;
      mutation.mutate(video.videoLinkIdentifier);
    },
  };
}
