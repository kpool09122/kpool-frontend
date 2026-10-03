"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { UserSettingsPanel, UserStatusMessage } from "@/components/User";
import { performRecentAuthentication } from "@/gateways/auth/recentAuthentication";
import { useAuthStore } from "@/gateways/auth/authStore";
import { webAuthnBrowserAdapter } from "@/gateways/auth/webAuthnBrowserAdapter";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { passkeyBrowserApi } from "@/gateways/identity/passkeyBrowserApi";
import { withdrawFromService } from "@/gateways/identity/withdrawIdentityBrowserApi";
import { useUserSection } from "../UserSectionContext";

export function UserOtherClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const clearIdentity = useAuthStore((state) => state.clearIdentity);
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const { currentIdentity, t } = useUserSection();
  const authenticatedIdentity = currentIdentity && "authenticationMethods" in currentIdentity
    ? currentIdentity as AuthenticatedIdentitySummary
    : null;
  const [isDialogOpen, setIsDialogOpen] = useState(searchParams.get("stepUp") === "complete");
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsReauthentication, setNeedsReauthentication] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(
    searchParams.get("stepUp") === "complete" ? t.withdrawalReauthComplete : null,
  );
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);
  const startButtonRef = useRef<HTMLButtonElement>(null);

  const closeDialog = () => {
    setIsDialogOpen(false);
    requestAnimationFrame(() => startButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!isDialogOpen) return;

    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !processingRef.current) {
        setIsDialogOpen(false);
        requestAnimationFrame(() => startButtonRef.current?.focus());
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled)") ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen]);

  const handleReauthentication = async () => {
    if (processingRef.current || !authenticatedIdentity) return;

    processingRef.current = true;
    setIsProcessing(true);
    setError(null);
    const result = await performRecentAuthentication({
      api: passkeyBrowserApi,
      linkedSocialProviders: authenticatedIdentity.authenticationMethods?.linkedSocialProviders ?? [],
      passkeyCount: authenticatedIdentity.authenticationMethods?.passkeyCount ?? 0,
      returnTo: "withdrawal",
      webAuthnAdapter: webAuthnBrowserAdapter,
    });

    if (result.status === "verified") {
      setNeedsReauthentication(false);
      setNotice(t.withdrawalReauthComplete);
    } else if (result.status === "redirect") {
      window.location.assign(result.url);
    } else {
      setError(
        result.kind === "unavailable"
          ? t.withdrawalVerificationUnavailable
          : result.kind === "cancelled"
            ? t.withdrawalVerificationCancelled
            : result.message ?? t.withdrawalVerificationFailed,
      );
    }
    processingRef.current = false;
    setIsProcessing(false);
  };

  const handleWithdraw = async () => {
    if (processingRef.current) return;

    processingRef.current = true;
    setIsProcessing(true);
    setError(null);
    setNotice(null);
    const result = await withdrawFromService();

    if (result.ok) {
      queryClient.clear();
      clearIdentity();
      router.replace(`/${currentIdentity?.language ?? "ja"}?withdrawal=complete`);
      router.refresh();
      return;
    }

    if (result.status === 401 && result.code === "authentication_required") {
      clearIdentity();
      router.replace("/login?returnTo=%2Fadmin%2Fuser%2Fother");
      router.refresh();
      return;
    }

    if (result.status === 401 && result.code === "recent_authentication_required") {
      setNeedsReauthentication(true);
      setError(t.withdrawalReauthRequired);
    } else if (result.status === 403 && result.code === "identity_withdrawal_not_allowed") {
      setError(t.withdrawalNotAllowed);
    } else if (result.status === 419 && result.code === "csrf_token_mismatch") {
      setError(t.withdrawalCsrfError);
    } else {
      setError(t.withdrawalFailed);
      await refreshIdentity();
    }
    processingRef.current = false;
    setIsProcessing(false);
  };

  return (
    <UserSettingsPanel title={t.withdrawalTitle}>
      <div className="mt-5 space-y-4">
        <p className="text-sm leading-7 text-text-muted">{t.withdrawalDescription}</p>
        <button
          className="rounded-lg border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          onClick={() => {
            setError(null);
            setNotice(null);
            setNeedsReauthentication(false);
            setIsDialogOpen(true);
          }}
          ref={startButtonRef}
          type="button"
        >
          {t.withdrawalStart}
        </button>
      </div>

      {isDialogOpen ? (
        <div aria-labelledby="withdrawal-dialog-title" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" ref={dialogRef} role="dialog">
          <div className="w-full max-w-xl space-y-5 rounded-xl bg-surface-raised p-6 text-text-strong shadow-xl">
            <h2 className="text-xl font-bold" id="withdrawal-dialog-title">{t.withdrawalDialogTitle}</h2>
            <ul className="list-disc space-y-3 pl-5 text-sm leading-7 text-text-muted">
              <li>{t.withdrawalPersonalNotice}</li>
              <li>{t.withdrawalRetentionNotice}</li>
              <li className="font-semibold text-red-700">{t.withdrawalIrreversibleNotice}</li>
            </ul>
            {error ? <UserStatusMessage variant="error">{error}</UserStatusMessage> : null}
            {notice ? <UserStatusMessage variant="success">{notice}</UserStatusMessage> : null}
            <div className="flex flex-wrap justify-end gap-3">
              <button
                className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold disabled:opacity-60"
                disabled={isProcessing}
                onClick={closeDialog}
                ref={cancelButtonRef}
                type="button"
              >
                {t.withdrawalCancel}
              </button>
              {needsReauthentication ? (
                <button className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isProcessing} onClick={() => void handleReauthentication()} type="button">
                  {t.withdrawalReauth}
                </button>
              ) : (
                <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isProcessing} onClick={() => void handleWithdraw()} type="button">
                  {isProcessing ? t.withdrawalProcessing : t.withdrawalConfirm}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </UserSettingsPanel>
  );
}
