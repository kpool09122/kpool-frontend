"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { IdentitySummary } from "@/gateways/identity/identityApi";
import type { useI18n } from "../../../i18n/I18nProvider";
import type { Locale } from "../../../i18n/locales";
import {
  adminSettingsTabRoutes,
  type AdminSettingsTab,
} from "../adminTypes";
import { UserSectionProvider } from "./UserSectionContext";
import { useUserSettings } from "./useUserSettings";

const createSettingsTab = (
  id: AdminSettingsTab,
  label: string,
): { id: AdminSettingsTab; label: string } => ({
  id,
  label,
});

type UserLayoutClientProps = {
  activeSettingsTab: AdminSettingsTab;
  children: ReactNode;
  currentIdentity: IdentitySummary | null;
  locale: Locale;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
  onRefreshIdentity: () => unknown;
};

export function UserLayoutClient({
  activeSettingsTab,
  children,
  currentIdentity,
  locale,
  t,
  onRefreshIdentity,
}: UserLayoutClientProps) {
  const {
    settingsState,
    cancelProfileImageCrop,
    confirmProfileImageCrop,
    deleteProfileImage,
    reportProfileImageCropError,
    saveIdentitySettings,
    updateProfileImage,
    updateSettingsField,
  } = useUserSettings({
    currentIdentity,
    locale,
    t,
    onRefreshIdentity,
  });
  const tabs = [
    createSettingsTab("profileSettings", t.profileSettingsTab),
    createSettingsTab("languageSettings", t.languageSettingsTab),
  ];

  return (
    <section className="space-y-5">
      <div className="overflow-x-auto border-b border-stroke-subtle">
        <div aria-label={t.settingsTabsLabel} className="-mb-px flex gap-1" role="tablist">
          {tabs.map((tab) => (
            <Link
              aria-selected={activeSettingsTab === tab.id}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeSettingsTab === tab.id
                  ? "border-brand-primary text-text-strong"
                  : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"
              }`}
              href={adminSettingsTabRoutes[tab.id]}
              key={tab.id}
              role="tab"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <UserSectionProvider
        value={{
          currentIdentity,
          settingsState,
          t,
          onProfileImageChange: updateProfileImage,
          onProfileImageCropCancel: cancelProfileImageCrop,
          onProfileImageCropConfirm: confirmProfileImageCrop,
          onProfileImageCropError: reportProfileImageCropError,
          onProfileImageDelete: deleteProfileImage,
          onSave: saveIdentitySettings,
          onUpdateField: updateSettingsField,
        }}
      >
        {children}
      </UserSectionProvider>
    </section>
  );
}
