"use client";

import { PasskeyAuthenticationButton, SocialAuthenticationButton } from "@/components/auth/AuthenticationMethodButtons";
import { identityProviders } from "@/gateways/auth/authFlow";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { getRecentAuthenticationMethods, type RecentAuthenticationMethod } from "@/gateways/auth/recentAuthentication";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  passkeyCount: number;
  linkedSocialProviders: string[];
  onSelect: (method: RecentAuthenticationMethod) => void;
  onClose: () => void;
};

export function RecentAuthenticationDialog({ passkeyCount, linkedSocialProviders, onSelect, onClose }: Props) {
  const { dictionary } = useI18n();
  const t = dictionary.admin;
  const titleId = useId();
  const descriptionId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const methods = getRecentAuthenticationMethods(passkeyCount, linkedSocialProviders);
  const providers = identityProviders.filter((provider) => methods.includes(provider.id));
  const hasPasskey = methods.includes("passkey");

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { trigger?.focus(); };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
    if (event.key !== "Tab") return;
    const buttons = panel.current?.querySelectorAll<HTMLButtonElement>("button");
    const first = buttons?.[0];
    const last = buttons?.[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onKeyDown={handleKeyDown} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panel} className="max-h-full w-full max-w-md space-y-5 overflow-y-auto rounded-xl border border-stroke-subtle bg-surface-raised p-6 text-text-strong shadow-xl">
        <h2 id={titleId} className="text-xl font-bold">{t.reauthenticationTitle}</h2>
        <p id={descriptionId} className="text-sm leading-6 text-text-muted">{t.reauthenticationDescription}</p>
        {methods.length === 0 ? <p role="alert" className="text-sm text-status-danger">{t.passkeyRecoveryRequired}</p> : null}
        {providers.length > 0 ? (
          <div className="grid gap-3" aria-label={t.reauthenticationTitle}>
            {providers.map((provider) => (
              <SocialAuthenticationButton key={provider.id} provider={provider} onClick={() => onSelect(provider.id)}>
                {t.reauthenticationSocial(provider.label)}
              </SocialAuthenticationButton>
            ))}
          </div>
        ) : null}
        {providers.length > 0 && hasPasskey ? (
          <div className="flex items-center gap-3 text-xs text-text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-stroke-subtle" />
            <span>{dictionary.login.alternative}</span>
            <span className="h-px flex-1 bg-stroke-subtle" />
          </div>
        ) : null}
        {hasPasskey ? (
          <PasskeyAuthenticationButton onClick={() => onSelect("passkey")}>
            {t.reauthenticationPasskey}
          </PasskeyAuthenticationButton>
        ) : null}
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold">{t.passkeyCancel}</button>
        </div>
      </div>
    </div>
  );
}
