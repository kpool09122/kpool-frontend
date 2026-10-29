"use client";

import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuthStore } from "@/gateways/auth/authStore";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { wikiVideoSessionKey } from "./useWikiVideoWatchRequests";

export async function recordOfficialVideoWatch(videoLinkIdentifier: string, sessionKey: string) {
  if (wikiVideoSessionKey() !== sessionKey) return { ok: false };
  const controller = new AbortController();
  const unsubscribe = useAuthStore.subscribe(() => {
    if (wikiVideoSessionKey() !== sessionKey) controller.abort();
  });
  try {
    const response = await browserApiFetch(`/api/wiki/videos/${encodeURIComponent(videoLinkIdentifier)}/watched`, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    });
    return { ok: response.status === 204 };
  } catch {
    return { ok: false };
  } finally {
    unsubscribe();
  }
}

export function useOfficialVideoWatch(sessionKey: string) {
  const client = useQueryClient();
  const [failures, setFailures] = useState<Record<string, true>>({});
  const mutationKey = ["official-video-watch", sessionKey];
  const pending = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    mutationFn: (identifier: string) => recordOfficialVideoWatch(identifier, sessionKey),
    onSuccess: (result, identifier) => {
      if (wikiVideoSessionKey() !== sessionKey) return;
      setFailures((previous) => {
        const next = { ...previous };
        if (result.ok) delete next[identifier];
        else next[identifier] = true;
        return next;
      });
      if (result.ok) {
        // Keep this visit's inbox and running queue intact. Reload reads the saved completion.
        void client.invalidateQueries({ queryKey: ["wiki-video-watch-requests", sessionKey] });
      }
    },
  });
  return {
    record: mutation.mutate,
    failed: Object.keys(failures).length > 0 && wikiVideoSessionKey() === sessionKey,
    pending,
    retry: () => { for (const identifier of Object.keys(failures)) mutation.mutate(identifier); },
  };
}
