"use client";

import { createContext, useContext, type ReactNode } from "react";

import type {
  MyPageDraftImageAdapter,
  MyPageDraftWikiAdapter,
} from "@/gateways/mypage/myPageAdapters";
import type { MyPageWikiTab } from "../myPageTypes";

export type WikiSectionContextValue = {
  activeWikiTab: MyPageWikiTab;
  draftImageAdapter: MyPageDraftImageAdapter;
  draftWikiAdapter: MyPageDraftWikiAdapter;
};

const WikiSectionContext = createContext<WikiSectionContextValue | null>(null);

export function WikiSectionProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: WikiSectionContextValue;
}) {
  return (
    <WikiSectionContext.Provider value={value}>
      {children}
    </WikiSectionContext.Provider>
  );
}

export const useWikiSection = () => {
  return useContext(WikiSectionContext) as WikiSectionContextValue;
};
