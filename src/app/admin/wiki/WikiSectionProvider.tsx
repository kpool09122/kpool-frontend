"use client";

import { createContext, useContext, type ReactNode } from "react";

import type {
  AdminDraftImageAdapter,
  AdminDraftWikiAdapter,
} from "@/gateways/admin/adminAdapters";
import type { WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import type { AdminWikiTab } from "../adminTypes";

export type WikiSectionContextValue = {
  activeWikiTab: AdminWikiTab;
  draftImageAdapter: AdminDraftImageAdapter;
  draftWikiAdapter: AdminDraftWikiAdapter;
  principalState: WikiPrincipalState;
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
