"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { updateAuthenticatedIdentity } from "@/gateways/identity/updateIdentityBrowserApi";
import { readFileAsDataUrl } from "../../../components/ImageCropper";
import type { useI18n } from "../../../i18n/I18nProvider";
import { localeLabels, type Locale } from "../../../i18n/locales";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import {
  isAcceptedWikiImageFile,
  isWikiImageFileSizeAllowed,
} from "@kpool/wiki";
import { UserSectionProvider } from "./UserSectionContext";
import {
  myPageSettingsTabRoutes,
  type MyPageIdentitySettingsState,
  type MyPageSettingsTab,
} from "../myPageTypes";

const createSettingsTab = (
  id: MyPageSettingsTab,
  label: string,
): { id: MyPageSettingsTab; label: string } => ({
  id,
  label,
});

type UserLayoutClientProps = {
  activeSettingsTab: MyPageSettingsTab;
  children: ReactNode;
  currentIdentity: IdentitySummary | null;
  locale: Locale;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
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
  const [settingsState, setSettingsState] = useState<MyPageIdentitySettingsState>(() =>
    createIdentitySettingsState(currentIdentity, locale),
  );
  const tabs = [
    createSettingsTab("profileSettings", t.profileSettingsTab),
    createSettingsTab("languageSettings", t.languageSettingsTab),
  ];
  const updateSettingsField = (field: "identityName" | "language", value: string) => {
    setSettingsState((state) => ({
      ...state,
      [field]: field === "language" && isSupportedLocale(value) ? value : value,
      error: null,
      imageReadError: null,
      success: null,
      syncError: null,
    }));
  };
  const updateProfileImage = (file: File | null) => {
    if (!file) {
      setSettingsState((state) => ({
        ...state,
        imageReadError: null,
        imageCropState: null,
        imagePreview: currentIdentity?.profileImage ?? null,
        profileImageMarkedForDeletion: false,
        profileImageBase64: null,
        success: null,
      }));
      return;
    }

    if (!isAcceptedWikiImageFile(file)) {
      setSettingsState((state) => ({
        ...state,
        imageCropState: null,
        imageReadError: t.profileImageInvalidFormat,
        success: null,
      }));
      return;
    }

    if (!isWikiImageFileSizeAllowed(file)) {
      setSettingsState((state) => ({
        ...state,
        imageCropState: null,
        imageReadError: t.profileImageTooLarge,
        success: null,
      }));
      return;
    }

    setSettingsState((state) => ({
      ...state,
      imageCropState: null,
      imageReadError: null,
      success: null,
    }));

    void readFileAsDataUrl(file).then((dataUrl) => {
      setSettingsState((state) => ({
        ...state,
        imageCropState: { file, sourceDataUrl: dataUrl },
        imageReadError: null,
        success: null,
      }));
    }).catch(() => {
      setSettingsState((state) => ({
        ...state,
        imageCropState: null,
        imageReadError: t.profileImageReadFailed,
        success: null,
      }));
    });
  };
  const confirmProfileImageCrop = (croppedDataUrl: string) => {
    setSettingsState((state) => ({
      ...state,
      imageCropState: null,
      imageReadError: null,
      imagePreview: croppedDataUrl,
      profileImageMarkedForDeletion: false,
      profileImageBase64: croppedDataUrl,
      success: null,
    }));
  };
  const cancelProfileImageCrop = () => {
    setSettingsState((state) => ({
      ...state,
      imageCropState: null,
      imageReadError: null,
      success: null,
    }));
  };
  const reportProfileImageCropError = (message: string) => {
    setSettingsState((state) => ({
      ...state,
      imageReadError: message,
      success: null,
    }));
  };
  const deleteProfileImage = () => {
    setSettingsState((state) => ({
      ...state,
      imageCropState: null,
      imagePreview: null,
      imageReadError: null,
      profileImageBase64: null,
      profileImageMarkedForDeletion: true,
      success: null,
    }));
  };
  const saveIdentitySettings = () => {
    const identityName = settingsState.identityName.trim();
    const shouldDeleteProfileImage = settingsState.profileImageMarkedForDeletion;

    if (!currentIdentity) {
      setSettingsState((state) => ({ ...state, error: t.identityUnavailableMessage, success: null }));
      return;
    }

    if (!identityName) {
      setSettingsState((state) => ({ ...state, error: t.profileIdentityNameRequired, success: null }));
      return;
    }

    if (settingsState.imageCropState) {
      setSettingsState((state) => ({
        ...state,
        imageReadError: t.profileImageCropRequired,
        success: null,
      }));
      return;
    }

    setSettingsState((state) => ({
      ...state,
      error: null,
      imageReadError: null,
      isSaving: true,
      success: null,
      syncError: null,
    }));

    void updateAuthenticatedIdentity({
      fallbackErrorMessage: t.identitySettingsSaveFailed,
      requestBody: {
        identityName,
        language: settingsState.language,
        ...(settingsState.profileImageBase64
          ? { base64EncodedImage: settingsState.profileImageBase64 }
          : settingsState.profileImageMarkedForDeletion
            ? { base64EncodedImage: null }
            : {}),
      },
    }).then(async (updatedIdentity) => {
      const effectiveIdentity = shouldDeleteProfileImage
        ? { ...updatedIdentity, profileImage: null }
        : updatedIdentity;

      await onRefreshIdentity();
      setSettingsState(createIdentitySettingsState(effectiveIdentity, settingsState.language));
      setSettingsState((state) => ({ ...state, success: t.identitySettingsSaved }));
    }).catch((error: unknown) => {
      setSettingsState((state) => ({
        ...state,
        error: error instanceof Error ? error.message : t.identitySettingsSaveFailed,
        isSaving: false,
        success: null,
      }));
    });
  };

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
              href={myPageSettingsTabRoutes[tab.id]}
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

const createIdentitySettingsState = (identity: IdentitySummary | null, fallbackLanguage: Locale): MyPageIdentitySettingsState => ({
  error: null,
  imagePreview: identity?.profileImage ?? null,
  imageReadError: null,
  imageCropState: null,
  identityName: identity?.identityName ?? "",
  isSaving: false,
  language: isSupportedLocale(identity?.language) ? identity.language : fallbackLanguage,
  profileImageMarkedForDeletion: false,
  profileImageBase64: null,
  syncError: null,
  success: null,
});

const isSupportedLocale = (value: unknown): value is Locale =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(localeLabels, value);
