"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { MyContactDetail } from "@/gateways/contact/contactApi";
import { fetchMyContactDetail, replyToMyContact } from "@/gateways/contact/contactBrowserApi";
import { canReplyToMyContact, findSavedMyContactReply, normalizeMyContactReplyContent } from "@/gateways/contact/contactConversation";

type Attempt = { contactIdentifier: string; content: string; previousIdentifiers: string[]; acknowledged: boolean };
type Phase = "idle" | "sending" | "checking" | "saved" | "notificationUnconfirmed" | "unknown" | "refreshFailed" | "rejected";

export function useMyContactReply({ queryScope, locale, fallbackErrorMessage, detailLoadFailed }: {
  queryScope: readonly (string | null | undefined)[];
  locale: string;
  fallbackErrorMessage: string;
  detailLoadFailed: string;
}) {
  const queryClient = useQueryClient();
  const mounted = useRef(false);
  const locked = useRef(false);
  // QueryClient lifetime, actor + inquiry scope: survives route/identity remounts.
  const attemptKey = (id: string) => ["myContactReplyAttempt", ...queryScope.slice(1), id];
  const retain = (attempt: Attempt) => {
    const key = attemptKey(attempt.contactIdentifier);
    queryClient.setQueryDefaults(key, { gcTime: Infinity });
    queryClient.setQueryData(key, attempt);
  };
  const forget = (id: string) => queryClient.removeQueries({ queryKey: attemptKey(id), exact: true });
  const currentAttempt = useRef<Attempt | null>(null);
  const [content, setContent] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessLost, setAccessLost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const mutation = useMutation({ mutationFn: replyToMyContact, retry: false });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const invalidate = async (contactIdentifier: string) => {
    // Do not refetch using a new identity's session after the original view unmounts.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryScope, refetchType: "none" }),
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey;
        return key[0] === "admin" && key[1] === "siteManagement" && key[3] === queryScope[1] && key[4] === queryScope[2]
          && (key[2] === "contacts" || (key[2] === "contact" && key.at(-1) === contactIdentifier));
      }, refetchType: "none" }),
    ]);
  };

  const handleReadError = (error: unknown) => {
    if (!mounted.current) return;
    if (error && typeof error === "object" && "contactRouteStatus" in error && [401, 403, 419].includes(Number(error.contactRouteStatus))) {
      setAccessLost(true);
      setErrorMessage(error instanceof Error ? error.message : detailLoadFailed);
    }
  };
  const confirm = async (attempt: Attempt) => {
    setPhase("checking");
    const key = [...queryScope, attempt.contactIdentifier];
    await queryClient.cancelQueries({ queryKey: key, exact: true });
    await fetchMyContactDetail({ contactIdentifier: attempt.contactIdentifier, fallbackErrorMessage: detailLoadFailed }).then((fresh) => {
      if (!mounted.current) return;
      queryClient.setQueryData(key, fresh);
      const saved = findSavedMyContactReply(fresh.replies, attempt.previousIdentifiers, attempt.content);
      if (attempt.acknowledged || saved) {
        forget(attempt.contactIdentifier);
        setContent("");
        setPhase(saved?.sentAt === null ? "notificationUnconfirmed" : "saved");
        currentAttempt.current = null;
      } else {
        // A dropped connection/502/500 can precede a delayed upstream commit.
        // Absence in one GET is never proof that this request cannot save later.
        retain(attempt);
        setPhase("unknown");
      }
    }, (error: unknown) => {
      if (!mounted.current) return;
      retain(attempt);
      handleReadError(error);
      setPhase(attempt.acknowledged ? "refreshFailed" : "unknown");
    });
  };

  const submit = async (contact: MyContactDetail) => {
    if (locked.current || accessLost || blocked || !normalizeMyContactReplyContent(content) || currentAttempt.current || queryClient.getQueryData(attemptKey(contact.contactIdentifier)) || !canReplyToMyContact(contact.replies)) return;
    locked.current = true;
    setBusy(true);
    setPhase("sending");
    setErrorMessage(null);
    // Fetch immediately before posting; never compare against an old dialog cache.
    const baseline = await fetchMyContactDetail({ contactIdentifier: contact.contactIdentifier, fallbackErrorMessage: detailLoadFailed }).then((fresh) => fresh, (error: unknown) => {
      handleReadError(error);
      if (mounted.current) setErrorMessage(error instanceof Error ? error.message : detailLoadFailed);
      return null;
    });
    if (!mounted.current || !baseline || !canReplyToMyContact(baseline.replies)) {
      locked.current = false;
      if (mounted.current) { setPhase("rejected"); setBusy(false); if (baseline) queryClient.setQueryData([...queryScope, contact.contactIdentifier], baseline); }
      return;
    }
    // Laravel TrimStrings applies to content; preserve the UI draft until saved.
    const attempt: Attempt = { contactIdentifier: contact.contactIdentifier, content: normalizeMyContactReplyContent(content), previousIdentifiers: baseline.replies.map((reply) => reply.replyIdentifier), acknowledged: false };
    currentAttempt.current = attempt;
    retain(attempt);
    const rejected = await mutation.mutateAsync({ contactIdentifier: attempt.contactIdentifier, content: attempt.content, locale, fallbackErrorMessage }).then(() => {
      attempt.acknowledged = true;
      retain(attempt);
      if (mounted.current) setContent("");
      return false;
    }, (error: unknown) => {
      if (error && typeof error === "object" && "contactRouteStatus" in error && typeof error.contactRouteStatus === "number" && [401, 403, 404, 409, 419, 422, 429].includes(error.contactRouteStatus)) {
        forget(attempt.contactIdentifier);
        currentAttempt.current = null;
        if (mounted.current) {
          setErrorMessage(error instanceof Error ? error.message : fallbackErrorMessage);
          setAccessLost([401, 403, 419].includes(error.contactRouteStatus));
          setBlocked([404, 409].includes(error.contactRouteStatus));
          setPhase("rejected");
        }
        return true;
      }
      return false;
    });
    await invalidate(attempt.contactIdentifier);
    if (mounted.current && !rejected) {
      await confirm(attempt);
      // Only the exact own list is active here; leave other scopes stale until revisited.
      await queryClient.refetchQueries({ queryKey: queryScope, exact: true, type: "active" });
    }
    locked.current = false;
    if (mounted.current) setBusy(false);
  };

  const recheck = async () => {
    const attempt = currentAttempt.current;
    if (locked.current || !attempt) return;
    locked.current = true;
    setBusy(true);
    await confirm(attempt);
    if (mounted.current && currentAttempt.current === null) {
      // Related routes may have fetched fresh caches while this save was unknown.
      await invalidate(attempt.contactIdentifier);
      if (mounted.current) await queryClient.refetchQueries({ queryKey: queryScope, exact: true, type: "active" });
    }
    locked.current = false;
    if (mounted.current) setBusy(false);
  };
  const select = (contactIdentifier: string | null): boolean => {
    if (locked.current) return false;
    const attempt = contactIdentifier ? queryClient.getQueryData<Attempt>(attemptKey(contactIdentifier)) : undefined;
    currentAttempt.current = attempt ?? null;
    setContent(attempt && !attempt.acknowledged ? attempt.content : "");
    setPhase(attempt ? (attempt.acknowledged ? "refreshFailed" : "unknown") : "idle");
    setErrorMessage(null);
    setBlocked(false);
    return true;
  };
  return { content, setContent, phase, errorMessage, accessLost, busy, blocked, needsConfirmation: phase === "unknown" || phase === "refreshFailed", select, submit, recheck };
}
