"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/gateways/auth/authStore";
import {
  canViewAnalysis,
  enableAnalyze,
  getAnalyzePrincipal,
} from "@/gateways/analyze/analyzePrincipal";
import { useAdmin } from "../AdminProvider";
import { getAdminAccountScope } from "../accountScope";

export function AnalyzeClient() {
  const { currentIdentity, refreshIdentity, t } = useAdmin();
  const auth = useAuthStore();
  const needsAuthentication =
    auth.status === "loading" && auth.sessionVersion === 0 && !auth.identity;
  useEffect(() => {
    if (needsAuthentication) void refreshIdentity();
  }, [needsAuthentication, refreshIdentity]);
  const scope = getAdminAccountScope(currentIdentity);
  if (
    auth.status === "guest" ||
    !auth.identity ||
    getAdminAccountScope(auth.identity) !== scope
  )
    return <p role="status">{t.analyze.loading}</p>;
  return (
    <AnalyzeWorkspace
      key={`${auth.sessionVersion}:${scope}`}
      scope={scope}
      version={auth.sessionVersion}
    />
  );
}

function AnalyzeWorkspace({
  scope,
  version,
}: {
  scope: string;
  version: number;
}) {
  const {
    refreshIdentity,
    t: { analyze: t },
  } = useAdmin();
  const key = ["admin", "analyze", "principal", scope, version];
  const principal = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getAnalyzePrincipal(signal),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<
    "duplicate" | "error" | "refreshError" | "forbidden" | null
  >(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const isCurrent = () => {
    const auth = useAuthStore.getState();
    return (
      mounted.current &&
      auth.status !== "guest" &&
      auth.sessionVersion === version &&
      !!auth.identity &&
      getAdminAccountScope(auth.identity) === scope
    );
  };
  const activate = async () => {
    if (busy || principal.data?.status !== "missing") return;
    setBusy(true);
    setFeedback(null);
    const result = await enableAnalyze();
    if (!isCurrent()) return;
    if (result.status === "error") {
      setFeedback(
        result.httpStatus === 401 || result.httpStatus === 403
          ? "forbidden"
          : "error",
      );
      setBusy(false);
      return;
    }
    // A duplicate is not permission recovery. Read the authoritative status again.
    const identity = await refreshIdentity({ preserveOnNull: true });
    if (!isCurrent()) return;
    const latest = await principal.refetch();
    if (!isCurrent()) return;
    if (
      !identity ||
      latest.data?.status === "error" ||
      latest.data?.status === "missing"
    )
      setFeedback("refreshError");
    else if (result.status === "duplicate") setFeedback("duplicate");
    setBusy(false);
  };
  const refreshStatus = async () => {
    if (busy || principal.isFetching) return;
    setBusy(true);
    const identity =
      feedback === "refreshError"
        ? await refreshIdentity({ preserveOnNull: true })
        : true;
    if (!isCurrent()) return;
    const latest = await principal.refetch();
    if (!isCurrent()) return;
    setFeedback(
      !identity || latest.data?.status === "error" ? "refreshError" : null,
    );
    setBusy(false);
  };
  const state = principal.data;
  const forbidden =
    feedback === "forbidden" ||
    (state?.status === "error" &&
      (state.httpStatus === 401 || state.httpStatus === 403));
  const stopped =
    state?.status === "available" && state.principal.status !== "active";
  const denied =
    state?.status === "available" &&
    !stopped &&
    !canViewAnalysis(state.principal);
  const error =
    feedback === "error" ||
    feedback === "refreshError" ||
    state?.status === "error";
  return (
    <section
      aria-label={t.title}
      className="space-y-4 rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft"
      aria-busy={busy || principal.isFetching}
    >
      <h2 className="text-xl font-semibold">{t.title}</h2>
      {!state || principal.isPending ? <p role="status">{t.loading}</p> : null}
      {feedback === "duplicate" ? <p role="status">{t.duplicate}</p> : null}
      {forbidden || stopped || denied ? (
        <p role="alert">
          {stopped
            ? state?.status === "available" &&
              state.principal.status === "forced_stop"
              ? t.forcedStop
              : t.suspended
            : t.forbidden}
        </p>
      ) : error ? (
        <p role="alert">
          {feedback === "refreshError" ? t.refreshError : t.error}
        </p>
      ) : null}
      {state?.status === "missing" &&
      !forbidden &&
      feedback !== "refreshError" ? (
        <>
          <p>{t.intro}</p>
          <button
            type="button"
            disabled={busy || principal.isFetching}
            onClick={() => void activate()}
            className="rounded-lg bg-brand-primary px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? t.enabling : t.enable}
          </button>
        </>
      ) : null}
      {state?.status === "available" &&
      !stopped &&
      !denied &&
      !forbidden &&
      !error &&
      !busy ? (
        <p role="status">{t.ready}</p>
      ) : null}
      {(state && state.status !== "missing") ||
      feedback === "refreshError" ||
      forbidden ? (
        <button
          type="button"
          disabled={busy || principal.isFetching}
          onClick={() => void refreshStatus()}
          className="rounded-lg border border-stroke-subtle px-4 py-2 disabled:opacity-50"
        >
          {t.retry}
        </button>
      ) : null}
      <p className="text-sm text-text-muted">{t.retention}</p>
    </section>
  );
}
