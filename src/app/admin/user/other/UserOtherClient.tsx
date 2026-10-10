"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { UserSettingsPanel, UserStatusMessage } from "@/components/User";
import { performRecentAuthentication } from "@/gateways/auth/recentAuthentication";
import { useAuthStore } from "@/gateways/auth/authStore";
import { webAuthnBrowserAdapter } from "@/gateways/auth/webAuthnBrowserAdapter";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { passkeyBrowserApi } from "@/gateways/identity/passkeyBrowserApi";
import { getWithdrawalEligibility, withdrawFromService } from "@/gateways/identity/withdrawIdentityBrowserApi";
import { useUserSection } from "../UserSectionContext";

export function UserOtherClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearIdentity = useAuthStore((state) => state.clearIdentity);
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const { currentIdentity, t } = useUserSection();
  const authenticatedIdentity = currentIdentity && "authenticationMethods" in currentIdentity
    ? currentIdentity as AuthenticatedIdentitySummary
    : null;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationIdentityName, setConfirmationIdentityName] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const nameMatches = confirmationIdentityName.length > 0 && confirmationIdentityName === currentIdentity?.identityName;
  const [isProcessing, setIsProcessing] = useState(false);
  const [reauthenticationRequired, setReauthenticationRequired] = useState(false);
  const [withdrawalDenied, setWithdrawalDenied] = useState(false);
  // パスキー一覧は退会と同じ recent authentication を検証し、有効期限を延長しない。
  const verificationQuery = useQuery({
    queryKey: ["identity-passkeys"],
    queryFn: () => passkeyBrowserApi.list(),
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  const needsReauthentication = reauthenticationRequired || !verificationQuery.data?.ok;
  const eligibilityQuery = useQuery({
    queryKey: ["identity-withdrawal-eligibility"],
    queryFn: getWithdrawalEligibility,
    enabled: !needsReauthentication,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  const withdrawalUnavailable = withdrawalDenied || (eligibilityQuery.data?.ok === true && !eligibilityQuery.data.data.canWithdraw);
  const verificationError = verificationQuery.data?.ok === false
    && verificationQuery.data.status !== 401 && verificationQuery.data.status !== 403
    ? verificationQuery.data.message
    : null;
  const [error, setError] = useState<string | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const contactLinkRef = useRef<HTMLAnchorElement>(null);
  const verifyButtonRef = useRef<HTMLButtonElement>(null);

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
      await verificationQuery.refetch();
      setReauthenticationRequired(false);
      requestAnimationFrame(() => startButtonRef.current?.focus());
    } else if (result.status === "redirect") {
      window.location.assign(result.url);
    } else {
      setError(
        result.kind === "unavailable"
          ? t.withdrawalVerificationUnavailable
          : result.kind === "cancelled"
            ? t.withdrawalVerificationCancelled
            : result.kind === "unsupported"
              ? t.passkeyUnsupported
              : result.kind === "expired"
                ? t.passkeyVerificationExpired
                : result.message ?? t.withdrawalVerificationFailed,
      );
    }
    processingRef.current = false;
    setIsProcessing(false);
  };

  const handleWithdraw = async () => {
    if (processingRef.current || withdrawalUnavailable || needsReauthentication || !nameMatches || isComposing) return;

    processingRef.current = true;
    setIsProcessing(true);
    setError(null);
    const result = await withdrawFromService(confirmationIdentityName);

    if (result.ok) {
      queryClient.clear();
      clearIdentity();
      router.replace(`/${currentIdentity?.language ?? "ja"}`);
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
      setReauthenticationRequired(true);
      setIsDialogOpen(false);
      setConfirmationIdentityName("");
      setError(t.withdrawalReauthRequired);
      router.replace("/admin/user/other");
      requestAnimationFrame(() => verifyButtonRef.current?.focus());
    } else if (result.status === 422 && result.code === "identity_name_confirmation_mismatch") {
      setError(t.withdrawalNameMismatch);
      setConfirmationIdentityName("");
      await refreshIdentity();
    } else if (result.status === 403 && result.code === "identity_withdrawal_not_allowed") {
      setWithdrawalDenied(true);
      setIsDialogOpen(false);
      setConfirmationIdentityName("");
      requestAnimationFrame(() => contactLinkRef.current?.focus());
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
    <UserSettingsPanel title={!needsReauthentication && withdrawalUnavailable ? t.withdrawalSupportTitle : t.withdrawalTitle}>
      <div className="mt-5 space-y-4">
        {verificationQuery.isPending ? (
          <p className="text-sm text-text-muted" role="status">{t.withdrawalVerificationChecking}</p>
        ) : needsReauthentication ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stroke-subtle bg-surface-base p-4">
            <p className="text-sm leading-6 text-text-muted">{t.withdrawalVerificationRequired}</p>
            <button
              className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
              disabled={isProcessing || verificationQuery.isFetching}
              onClick={() => void handleReauthentication()}
              ref={verifyButtonRef}
              type="button"
            >
              {isProcessing ? t.withdrawalVerifying : t.withdrawalReauth}
            </button>
          </div>
        ) : eligibilityQuery.isPending ? (
          <p className="text-sm text-text-muted" role="status">{t.withdrawalCheckingEligibility}</p>
        ) : withdrawalUnavailable ? (
          <>
            <p className="text-sm leading-7 text-text-muted">{t.withdrawalNotAllowed}</p>
            <Link className="inline-flex rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary" href="/contact" ref={contactLinkRef}>
              {t.withdrawalContact}
            </Link>
          </>
        ) : eligibilityQuery.data?.ok === false ? (
          <>
            <UserStatusMessage variant="error">{eligibilityQuery.data.message}</UserStatusMessage>
            <button
              className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold disabled:opacity-60"
              disabled={eligibilityQuery.isFetching}
              onClick={() => void eligibilityQuery.refetch()}
              type="button"
            >
              {t.withdrawalRetry}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm leading-7 text-text-muted">{t.withdrawalDescription}</p>
            <button
              className="rounded-lg border border-status-danger px-5 py-2.5 text-sm font-semibold text-status-danger transition hover:bg-status-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              onClick={() => {
                setError(null);
                setConfirmationIdentityName("");
                setIsComposing(false);
                setIsDialogOpen(true);
              }}
              ref={startButtonRef}
              type="button"
            >
              {t.withdrawalStart}
            </button>
          </>
        )}
        {(!withdrawalUnavailable || needsReauthentication) && !isDialogOpen && (error || verificationError) ? <UserStatusMessage variant="error">{error ?? verificationError}</UserStatusMessage> : null}
      </div>

      {isDialogOpen && !withdrawalUnavailable && !needsReauthentication ? (
        <div aria-labelledby="withdrawal-dialog-title" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" ref={dialogRef} role="dialog">
          <div className="w-full max-w-xl space-y-5 rounded-xl bg-surface-raised p-6 text-text-strong shadow-xl">
            <h2 className="text-xl font-bold" id="withdrawal-dialog-title">{t.withdrawalDialogTitle}</h2>
            <ul className="list-disc space-y-3 pl-5 text-sm leading-7 text-text-muted">
              <li>{t.withdrawalPersonalNotice}</li>
              <li className="font-semibold text-status-danger">
                <p>{t.withdrawalIrreversibleNotice}</p>
                <p className="mt-1 font-normal">{t.withdrawalIrreversibleDetail}</p>
              </li>
            </ul>
            <div className="space-y-2">
              <label className="block text-sm font-semibold" htmlFor="withdrawal-name-confirmation">{t.withdrawalSignatureLabel}</label>
              <p className="text-sm leading-6 text-text-muted" id="withdrawal-name-confirmation-hint">{t.withdrawalSignatureInstruction}</p>
              <input
                aria-describedby="withdrawal-name-confirmation-hint"
                autoComplete="off"
                autoCorrect="off"
                className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-sm disabled:opacity-60"
                disabled={isProcessing}
                id="withdrawal-name-confirmation"
                maxLength={32}
                onChange={(event) => setConfirmationIdentityName(event.target.value)}
                onCompositionEnd={() => setIsComposing(false)}
                onCompositionStart={() => setIsComposing(true)}
                onCopy={(event) => event.preventDefault()}
                onDrop={(event) => event.preventDefault()}
                onPaste={(event) => event.preventDefault()}
                placeholder={currentIdentity?.identityName ?? ""}
                required
                spellCheck={false}
                type="text"
                value={confirmationIdentityName}
              />
            </div>
            {error ? <UserStatusMessage variant="error">{error}</UserStatusMessage> : null}
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
              <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isProcessing || !nameMatches || isComposing} onClick={() => void handleWithdraw()} type="button">
                {isProcessing ? t.withdrawalProcessing : t.withdrawalConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </UserSettingsPanel>
  );
}
