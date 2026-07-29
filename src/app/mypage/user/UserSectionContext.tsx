"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { IdentitySummary } from "@/gateways/identity/identityApi";
import type { useI18n } from "../../../i18n/I18nProvider";
import type { MyPageIdentitySettingsState } from "../myPageTypes";

export type UserSectionContextValue = {
  currentIdentity: IdentitySummary | null;
  settingsState: MyPageIdentitySettingsState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onProfileImageChange: (file: File | null) => void;
  onProfileImageCropCancel: () => void;
  onProfileImageCropConfirm: (croppedDataUrl: string) => void;
  onProfileImageCropError: (message: string) => void;
  onProfileImageDelete: () => void;
  onSave: () => void;
  onUpdateField: (field: "identityName" | "language", value: string) => void;
};

const UserSectionContext = createContext<UserSectionContextValue | null>(null);

export function UserSectionProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: UserSectionContextValue;
}) {
  return (
    <UserSectionContext.Provider value={value}>
      {children}
    </UserSectionContext.Provider>
  );
}

export const useUserSection = () => useContext(UserSectionContext) as UserSectionContextValue;
