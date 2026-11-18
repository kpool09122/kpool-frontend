"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/gateways/auth/authStore";
import { useI18n } from "@/i18n/I18nProvider";
import { oauthConnectionsDictionaries } from "@/i18n/oauthConnections";
import { OAuthConnectionsPanel } from "./OAuthConnectionsPanel";

export function UserExternalConnectionsClient() {
  const { locale } = useI18n();
  const t = oauthConnectionsDictionaries[locale];
  const { identity, status, sessionVersion, refreshIdentity } = useAuthStore();
  const initialized = useRef(false);
  useEffect(() => {
    if (
      status === "loading" &&
      !identity &&
      sessionVersion === 0 &&
      !initialized.current
    ) {
      initialized.current = true;
      void refreshIdentity();
    }
  }, [status, identity, sessionVersion, refreshIdentity]);

  return identity ? (
    <OAuthConnectionsPanel
      identityIdentifier={identity.identityIdentifier}
      sessionVersion={sessionVersion}
    />
  ) : (
    <section id="external-connections" aria-label={t.title}>
      <p role={status === "guest" ? "alert" : "status"}>
        {status === "guest" ? t.session : t.loading}
      </p>
    </section>
  );
}
