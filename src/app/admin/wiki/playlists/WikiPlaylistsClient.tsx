"use client";

import { useEffect, useId, useState } from "react";
import { useWikiPlaylists } from "@/gateways/wiki/useWikiPlaylists";
import { useAuthStore } from "@/gateways/auth/authStore";
import { useI18n } from "@/i18n/I18nProvider";
import { useWikiSection } from "../WikiSectionProvider";
import { PlaylistCreatePanel, PlaylistEditPanel, PlaylistListPanel } from "./PlaylistPanels";
import { PlaylistFeedback } from "./PlaylistFeedback";
import { type Text, type PlaybackText } from "./playlistUi";

export function WikiPlaylistsClient() {
  const { principalState } = useWikiSection();
  const { dictionary } = useI18n();
  const auth = useAuthStore();
  const needsAuthentication =
    auth.status === "loading" && auth.sessionVersion === 0 && !auth.identity;
  const refreshIdentity = auth.refreshIdentity;
  useEffect(() => {
    if (needsAuthentication) void refreshIdentity();
  }, [needsAuthentication, refreshIdentity]);
  if (
    principalState.status !== "available" ||
    principalState.principal.status !== "active" ||
    auth.status !== "authenticated"
  )
    return null;
  const scope = [
    principalState.principal.principalIdentifier,
    auth.identity?.identityIdentifier,
    auth.identity?.accountIdentifier,
    auth.identity?.accountPrincipalIdentifier,
    auth.sessionVersion,
  ].join(":");
  return (
    <PlaylistWorkspace
      key={scope}
      principal={scope}
      t={dictionary.admin.playlists}
      playbackText={dictionary.wiki.videos.continuous}
    />
  );
}
type PlaylistTab = "list" | "create" | "edit";

export function PlaylistWorkspace({ principal, t, playbackText }: {
  principal: string; t: Text; playbackText: PlaybackText;
}) {
  const state = useWikiPlaylists(principal);
  const instanceId = useId();
  const [activeTab, setActiveTab] = useState<PlaylistTab>("list");
  const tabs: Array<{ id: PlaylistTab; label: string }> = [
    { id: "list", label: t.listTab },
    { id: "create", label: t.createTab },
    { id: "edit", label: t.editTab },
  ];
  const locked = state.busy || state.committed;
  return (
    <section aria-label={t.title} className="mt-5 rounded-lg border border-stroke-subtle bg-surface-raised p-5 shadow-soft">
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <div className="mt-5 grid gap-5">
        <div className="grid gap-4">
          <div className="overflow-x-auto border-b border-stroke-subtle">
            <div aria-label={t.tabsLabel} className="-mb-px flex gap-1" role="tablist"
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
                const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
                const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
                  : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
                event.preventDefault();
                buttons[next]?.focus();
                buttons[next]?.click();
              }}>
              {tabs.map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <button key={tab.id} type="button" role="tab"
                    id={`${instanceId}-${tab.id}-tab`} aria-controls={`${instanceId}-${tab.id}-panel`}
                    aria-selected={selected} tabIndex={selected ? 0 : -1}
                    disabled={locked && !selected} onClick={() => {
                      if (!selected) {
                        state.clearFeedback();
                        setActiveTab(tab.id);
                      }
                    }}
                    className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${selected
                      ? "border-brand-primary text-text-strong"
                      : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"}`}>
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div role="tabpanel" id={`${instanceId}-${activeTab}-panel`} aria-labelledby={`${instanceId}-${activeTab}-tab`}>
            {activeTab === "list" ? <PlaylistListPanel state={state} principal={principal} t={t} playbackText={playbackText} /> : null}
            {activeTab === "create" ? <PlaylistCreatePanel state={state} t={t} /> : null}
            {activeTab === "edit" ? <PlaylistEditPanel state={state} t={t} /> : null}
            <PlaylistFeedback state={state} t={t} showLikes={activeTab === "edit"} />
          </div>
        </div>
      </div>
    </section>
  );
}
