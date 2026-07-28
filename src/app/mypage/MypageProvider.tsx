"use client";

import { createContext, useContext, type ReactNode } from "react";

import { hasAccountPolicy, isCorporationAccount } from "@/gateways/account/accountPolicy";
import { useAuthStore, type AuthIdentityRefresh } from "@/gateways/auth/authStore";
import { getAccountIdentifierFromIdentity } from "@/gateways/wiki/wikiPrincipal";
import { useI18n } from "../../i18n/I18nProvider";
import type { Locale } from "../../i18n/locales";
import type { MyPageRouteContext } from "./myPageTypes";

type MypageContextValue = MyPageRouteContext & {
  canShowAccountSettings: boolean;
  currentIdentity: MyPageRouteContext["initialIdentity"];
  locale: Locale;
  refreshIdentity: AuthIdentityRefresh;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
};

const MypageContext = createContext<MypageContextValue | null>(null);

const canShowAccountSettingsForIdentity = (currentIdentity: MyPageRouteContext["initialIdentity"]) => {
  const accountIdentifier = getAccountIdentifierFromIdentity(currentIdentity);

  return Boolean(accountIdentifier) && isCorporationAccount(currentIdentity) && hasAccountPolicy(currentIdentity);
};

export function MypageProvider({
  children,
  initialContext,
}: {
  children: ReactNode;
  initialContext: MyPageRouteContext;
}) {
  const authIdentity = useAuthStore((state) => state.identity);
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const currentIdentity = authIdentity ?? initialContext.initialIdentity;
  const { dictionary, locale } = useI18n();

  return (
    <MypageContext.Provider
      value={{
        ...initialContext,
        canShowAccountSettings: canShowAccountSettingsForIdentity(currentIdentity),
        currentIdentity,
        locale,
        refreshIdentity,
        t: dictionary.mypage,
      }}
    >
      {children}
    </MypageContext.Provider>
  );
}

export const useMypage = () => {
  return useContext(MypageContext) as MypageContextValue;
};
