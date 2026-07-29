import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import type { IdentitySummary } from "@/gateways/identity/identityApi";
import { updateAuthenticatedIdentity } from "@/gateways/identity/updateIdentityBrowserApi";
import { readFileAsDataUrl } from "../../../components/ImageCropper";
import type { useI18n } from "../../../i18n/I18nProvider";
import { localeLabels, type Locale } from "../../../i18n/locales";
import type { MyPageIdentitySettingsState } from "../myPageTypes";
import {
  isAcceptedWikiImageFile,
  isWikiImageFileSizeAllowed,
} from "@kpool/wiki";

type UserSettingsField = "identityName" | "language";

type UseUserSettingsParams = {
  currentIdentity: IdentitySummary | null;
  locale: Locale;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onRefreshIdentity: () => unknown;
};

type SaveIdentitySettingsParams = {
  identityName: string;
  language: Locale;
  profileImageBase64: string | null;
  profileImageMarkedForDeletion: boolean;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const useUserSettings = ({
  currentIdentity,
  locale,
  t,
  onRefreshIdentity,
}: UseUserSettingsParams) => {
  const [settingsState, setSettingsState] = useState<MyPageIdentitySettingsState>(() =>
    createIdentitySettingsState(currentIdentity, locale),
  );

  const saveMutation = useMutation<IdentitySummary, Error, SaveIdentitySettingsParams>({
    mutationFn: ({
      identityName,
      language,
      profileImageBase64,
      profileImageMarkedForDeletion,
    }) => {
      if (!currentIdentity) {
        return Promise.reject(new Error(t.identityUnavailableMessage));
      }

      return updateAuthenticatedIdentity({
        fallbackErrorMessage: t.identitySettingsSaveFailed,
        requestBody: {
          identityName,
          language,
          ...(profileImageBase64
            ? { base64EncodedImage: profileImageBase64 }
            : profileImageMarkedForDeletion
              ? { base64EncodedImage: null }
              : {}),
        },
      });
    },
    onMutate: () => {
      setSettingsState((state) => ({
        ...state,
        error: null,
        imageReadError: null,
        isSaving: true,
        success: null,
        syncError: null,
      }));
    },
    onSuccess: async (updatedIdentity, variables) => {
      const effectiveIdentity = variables.profileImageMarkedForDeletion
        ? { ...updatedIdentity, profileImage: null }
        : updatedIdentity;

      await Promise.resolve(onRefreshIdentity());
      setSettingsState(createIdentitySettingsState(effectiveIdentity, variables.language));
      setSettingsState((state) => ({ ...state, success: t.identitySettingsSaved }));
    },
    onError: (error) => {
      setSettingsState((state) => ({
        ...state,
        error: getErrorMessage(error, t.identitySettingsSaveFailed),
        isSaving: false,
        success: null,
      }));
    },
  });

  const updateSettingsField = (field: UserSettingsField, value: string) => {
    setSettingsState((state) => ({
      ...state,
      ...(field === "identityName"
        ? { identityName: value }
        : isSupportedLocale(value)
          ? { language: value }
          : {}),
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

    saveMutation.mutate({
      identityName,
      language: settingsState.language,
      profileImageBase64: settingsState.profileImageBase64,
      profileImageMarkedForDeletion: settingsState.profileImageMarkedForDeletion,
    });
  };

  return {
    settingsState: {
      ...settingsState,
      isSaving: saveMutation.isPending || settingsState.isSaving,
    },
    cancelProfileImageCrop,
    confirmProfileImageCrop,
    deleteProfileImage,
    reportProfileImageCropError,
    saveIdentitySettings,
    updateProfileImage,
    updateSettingsField,
  };
};

const createIdentitySettingsState = (
  identity: IdentitySummary | null,
  fallbackLanguage: Locale,
): MyPageIdentitySettingsState => ({
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
