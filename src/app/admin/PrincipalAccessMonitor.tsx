"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAuthStore,
  type AuthIdentityRefresh,
} from "@/gateways/auth/authStore";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { getCurrentWikiPrincipal } from "@/gateways/wiki/wikiPrincipal";
import { adminQueryKeys } from "./queryKeys";
import type { useI18n } from "@/i18n/I18nProvider";

/** Lock stale tools immediately on a principal_inactive error, then revalidate identity/principal. */
export function PrincipalAccessMonitor({
  children,
  identity,
  refreshIdentity,
  t,
}: {
  children: ReactNode;
  identity: AuthenticatedIdentitySummary;
  refreshIdentity: AuthIdentityRefresh;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
}) {
  const client = useQueryClient();
  const pathname = usePathname();
  const [blocked, setBlocked] = useState(false);
  const [wikiRefresh, setWikiRefresh] = useState(false);
  useEffect(() => {
    let valid = true;
    let busy = false;
    const version = useAuthStore.getState().sessionVersion;
    const refresh = async (event: Event) => {
      if (busy) return;
      busy = true;
      setBlocked(true);
      const wiki =
        event instanceof CustomEvent &&
        typeof event.detail?.path === "string" &&
        event.detail.path.startsWith("/api/wiki/");
      setWikiRefresh(wiki);
      const latest = await refreshIdentity({ preserveOnNull: true }).catch(
        () => null,
      );
      if (!valid || useAuthStore.getState().sessionVersion !== version) return;
      if (
        !latest ||
        latest.identityIdentifier !== identity.identityIdentifier ||
        latest.accountIdentifier !== identity.accountIdentifier
      ) {
        busy = false;
        return;
      }
      if (wiki) {
        const principal = await getCurrentWikiPrincipal();
        if (!valid || useAuthStore.getState().sessionVersion !== version)
          return;
        client.setQueryData(
          adminQueryKeys.principal.current(
            identity.identityIdentifier,
            identity.accountIdentifier ?? null,
          ),
          principal,
        );
        setBlocked(principal.status === "error");
      } else setBlocked(false);
      busy = false;
    };
    window.addEventListener("kpool:principal-inactive", refresh);
    return () => {
      valid = false;
      window.removeEventListener("kpool:principal-inactive", refresh);
    };
  }, [
    client,
    identity.identityIdentifier,
    identity.accountIdentifier,
    refreshIdentity,
  ]);
  if (blocked && !pathname?.startsWith("/admin/user"))
    return (
      <section role="alert" className="p-6">
        <p>{t.principalStatus.inactive}</p>
        <Link className="mt-4 block underline" href="/admin/user/profile">
          {t.settingsMenu}
        </Link>
        <button
          type="button"
          className="mt-4 rounded-lg border p-2"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("kpool:principal-inactive", {
                detail: {
                  path: wikiRefresh ? "/api/wiki/retry" : "/api/account/retry",
                },
              }),
            )
          }
        >
          {t.retryPrincipal}
        </button>
      </section>
    );
  return children;
}
