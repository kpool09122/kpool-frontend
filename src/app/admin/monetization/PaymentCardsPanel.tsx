"use client";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import { useQuery } from "@tanstack/react-query";
import { ExternalConnectionVerification } from "@/components/User/ExternalConnectionVerification";
import { useAuthStore } from "@/gateways/auth/authStore";
import {
  hasCardPermission,
  paymentCardsApi,
  type CardFailure,
} from "@/gateways/monetization/paymentCards";
import type { MonetizationPrincipal } from "@/gateways/monetization/monetizationPrincipal";
import {
  clearCardRecovery,
  readCardRecovery,
  saveCardRecovery,
  type CardOperation,
} from "@/gateways/monetization/cardRecovery";
import type { PaymentCardsLabels } from "@/i18n/paymentCards";
const button =
  "rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold disabled:opacity-50";
export function PaymentCardsPanel({
  scope,
  accountIdentifier,
  principal,
  t,
  refreshAccess,
}: {
  scope: string;
  accountIdentifier: string;
  principal: MonetizationPrincipal;
  t: PaymentCardsLabels;
  refreshAccess: () => unknown;
}) {
  const sessionVersion = useAuthStore((s) => s.sessionVersion);
  const readable = hasCardPermission(
    principal,
    accountIdentifier,
    "payment_method_read",
  );
  const writable =
    hasCardPermission(
      principal,
      accountIdentifier,
      "card_registration_prepare",
    ) &&
    hasCardPermission(principal, accountIdentifier, "payment_method_register");
  const deletable = hasCardPermission(
    principal,
    accountIdentifier,
    "payment_method_delete",
  );
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<keyof PaymentCardsLabels | null>(null);
  const [pending, setPending] = useState<CardOperation | null>(null);
  const [verification, setVerification] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [setup, setSetup] = useState<{
    setupIntentIdentifier: string;
    clientSecret: string;
  } | null>(null);
  const [stripe, setStripe] = useState<ReturnType<typeof loadStripe> | null>(
    null,
  );
  const operation = useRef({ alive: false, busy: false });
  const list = useQuery({
    queryKey: ["payment-cards", scope, sessionVersion],
    queryFn: ({ signal }) => paymentCardsApi.list(signal),
    enabled: readable && !denied,
    retry: false,
    gcTime: 0,
  });
  useEffect(() => {
    const token = { alive: true, busy: false };
    operation.current = token;
    // Restore browser-only, non-secret redirect recovery after hydration.
    void Promise.resolve().then(() => {
      const recovery = readCardRecovery(scope);
      if (token.alive && recovery) {
        setPending(recovery.operation);
        setMessage("resumeDescription");
      }
    });
    return () => {
      token.alive = false;
    };
  }, [scope]);
  const failure = (result: CardFailure, fallback: keyof PaymentCardsLabels) => {
    if (
      result.status === 403 ||
      (result.status === 401 &&
        result.code !== "recent_authentication_required")
    ) {
      setDenied(true);
      setSetup(null);
      setStripe(null);
      setPending(null);
      clearCardRecovery();
      setMessage("forbidden");
      void refreshAccess();
    } else if (result.code === "recent_authentication_required") {
      setVerification(true);
      setMessage(null);
    } else setMessage(fallback);
  };
  const refresh = async (committed?: "save" | "delete") => {
    const token = operation.current;
    const result = await list.refetch();
    if (!token.alive) return;
    if (result.data?.ok)
      setMessage(
        committed === "save"
          ? "saved"
          : committed === "delete"
            ? "deleted"
            : null,
      );
    else if (result.data)
      failure(
        result.data,
        committed === "save"
          ? "savedRefreshFailed"
          : committed === "delete"
            ? "deletedRefreshFailed"
            : "failed",
      );
  };
  const run = async (action: CardOperation) => {
    const token = operation.current;
    if (
      !token.alive ||
      token.busy ||
      denied ||
      !readable ||
      (action.kind === "delete" ? !deletable : !writable)
    )
      return;
    if (
      action.kind === "prepare" &&
      !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_")
    ) {
      setMessage("unconfigured");
      return;
    }
    token.busy = true;
    setBusy(true);
    setMessage(null);
    setPending(action);
    setDeleting(null);
    setVerification(false);
    if (action.kind === "complete") {
      setSetup(null);
      setStripe(null);
    }
    const result =
      action.kind === "prepare"
        ? await paymentCardsApi.prepare()
        : action.kind === "complete"
          ? await paymentCardsApi.complete(action.identifier)
          : await paymentCardsApi.delete(action.identifier);
    if (!token.alive) return;
    if (!result.ok) {
      token.busy = false;
      setBusy(false);
      failure(
        result,
        action.kind === "complete" ? "completionFailed" : "failed",
      );
      return;
    }
    setPending(null);
    clearCardRecovery();
    if (action.kind === "prepare") {
      // Client secret stays only in this mounted component, never Query cache/storage/URLs.
      const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!key || !key.startsWith("pk_")) {
        token.busy = false;
        setBusy(false);
        setMessage("unconfigured");
        return;
      }
      const prepared = result.data as {
        setupIntentIdentifier: string;
        clientSecret: string;
      };
      const promise = loadStripe(key).catch(() => {
        if (token.alive) setMessage("stripeFailed");
        return null;
      });
      setStripe(promise);
      setSetup(prepared);
    } else {
      setSetup(null);
      setStripe(null);
      await refresh(action.kind === "complete" ? "save" : "delete");
    }
    if (token.alive) {
      token.busy = false;
      setBusy(false);
    }
  };
  // Never render cached private cards after an auth failure or a revoked read grant.
  const listDenied =
    !list.data?.ok && (list.data?.status === 401 || list.data?.status === 403);
  if (!readable) return null;
  if (denied || listDenied)
    return (
      <section aria-label={t.title}>
        <p role="alert">{t.forbidden}</p>
      </section>
    );
  const cards = list.data?.ok ? list.data.data.paymentMethods : [];
  return (
    <section
      aria-label={t.title}
      className="min-w-0 space-y-4 rounded-xl border border-stroke-subtle bg-surface-raised p-5"
    >
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <p className="text-sm text-text-muted">{t.description}</p>
      {message ? <p role="status">{t[message]}</p> : null}
      {list.isPending ? (
        <p role="status">{t.loading}</p>
      ) : !list.data?.ok ? (
        <p role="alert">{t.failed}</p>
      ) : cards.length === 0 ? (
        <p>{t.empty}</p>
      ) : (
        <ul className="space-y-3">
          {cards.map((card) => (
            <li
              key={card.paymentMethodIdentifier}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stroke-subtle p-4"
            >
              <div>
                <p>
                  {card.brand ?? "—"} ••••{" "}
                  {card.last4 && /^\d{4}$/.test(card.last4) ? card.last4 : "—"}
                </p>
                <p className="text-sm">
                  {t.expiry}: {card.expMonth ?? "—"}/{card.expYear ?? "—"}
                </p>
              </div>
              {deletable ? (
                <button
                  type="button"
                  className={button}
                  disabled={busy || verification || !!setup || !!pending}
                  onClick={() => {
                    setMessage(null);
                    setDeleting(card.paymentMethodIdentifier);
                  }}
                >
                  {t.remove}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={button}
          disabled={busy || list.isFetching}
          onClick={() => void refresh()}
        >
          {t.refresh}
        </button>
        {writable && !setup && !pending ? (
          <button
            type="button"
            className={button}
            disabled={busy || list.isPending || !list.data?.ok}
            onClick={() => void run({ kind: "prepare" })}
          >
            {t.add}
          </button>
        ) : null}
      </div>
      {verification ? (
        <ExternalConnectionVerification
          verificationMessage={t.stepUpRequired}
          returnTo="external-connections"
          onVerified={() => (pending ? run(pending) : undefined)}
          beforeRedirect={() =>
            pending ? saveCardRecovery(scope, pending) : false
          }
        />
      ) : null}
      {verification ? (
        <button
          type="button"
          className={button}
          onClick={() => {
            setVerification(false);
            setPending(null);
            clearCardRecovery();
            setMessage("cancelled");
          }}
        >
          {t.cancel}
        </button>
      ) : null}
      {pending && !verification ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => void run(pending)}
          >
            {pending.kind === "complete" ? t.retryCompletion : t.resume}
          </button>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => {
              setPending(null);
              clearCardRecovery();
              setMessage("cancelled");
            }}
          >
            {t.cancel}
          </button>
        </div>
      ) : null}
      {writable && setup && stripe ? (
        <Elements stripe={stripe}>
          <SecureCardForm
            clientSecret={setup.clientSecret}
            setupIntentIdentifier={setup.setupIntentIdentifier}
            t={t}
            disabled={busy}
            isCurrent={() => operation.current.alive && !denied}
            onComplete={(identifier) => run({ kind: "complete", identifier })}
            onError={() => setMessage("stripeFailed")}
            onCancel={() => {
              setSetup(null);
              setStripe(null);
              setMessage(null);
            }}
          />
        </Elements>
      ) : null}
      {deleting ? (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-stroke-subtle bg-surface-raised p-5 shadow-soft">
              <Dialog.Title>{t.confirmDelete}</Dialog.Title>
              <Dialog.Description className="mt-3">
                {t.deleteQuestion}
              </Dialog.Description>
              <p className="mt-3">
                {
                  cards.find((c) => c.paymentMethodIdentifier === deleting)
                    ?.brand
                }{" "}
                ••••{" "}
                {
                  cards.find((c) => c.paymentMethodIdentifier === deleting)
                    ?.last4
                }
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  autoFocus
                  className={button}
                  onClick={() => setDeleting(null)}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  className={button}
                  onClick={() =>
                    void run({ kind: "delete", identifier: deleting })
                  }
                >
                  {t.confirmDelete}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </section>
  );
}
function SecureCardForm({
  clientSecret,
  setupIntentIdentifier,
  t,
  disabled,
  isCurrent,
  onComplete,
  onError,
  onCancel,
}: {
  clientSecret: string;
  setupIntentIdentifier: string;
  t: PaymentCardsLabels;
  disabled: boolean;
  isCurrent: () => boolean;
  onComplete: (identifier: string) => unknown;
  onError: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const submit = async () => {
    if (!stripe || !elements || lock.current || disabled || !isCurrent())
      return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    lock.current = true;
    setBusy(true);
    // CardElement owns PAN/CVC. confirmCardSetup handles card 3DS in Stripe's modal,
    // so neither return URLs nor application storage ever contain a client secret.
    await stripe
      .confirmCardSetup(clientSecret, { payment_method: { card } })
      .then(async (result) => {
        if (!alive.current || !isCurrent()) return;
        if (
          !result.error &&
          result.setupIntent?.status === "succeeded" &&
          result.setupIntent.id === setupIntentIdentifier
        )
          await onComplete(setupIntentIdentifier);
        else onError();
      })
      .catch(() => {
        if (alive.current && isCurrent()) onError();
      });
    if (alive.current) {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4 rounded-lg border border-stroke-subtle p-4">
      <CardElement
        options={{ hidePostalCode: true }}
        onReady={() => setReady(true)}
        onLoadError={() => setFailed(true)}
      />
      {failed ? <p role="alert">{t.stripeFailed}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={button}
          disabled={
            !stripe || !elements || !ready || busy || disabled || failed
          }
          onClick={() => void submit()}
        >
          {busy || disabled ? t.busy : t.save}
        </button>
        <button
          type="button"
          className={button}
          disabled={busy || disabled}
          onClick={onCancel}
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
