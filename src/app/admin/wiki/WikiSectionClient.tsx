"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { getAccountCategoryFromIdentity } from "@/gateways/account/accountIdentity";
import type {
  AdminDraftImageAdapter,
  AdminDraftWikiAdapter,
  AdminOfficialCertificationAdapter,
  AdminPrincipalAdapter,
} from "@/gateways/admin/adminAdapters";
import {
  autoCreateWiki,
  createAutoCreateWikiRequestBodyFromInitialFields,
  approveWikiDraft,
  createWiki,
  createWikiRequestBodyFromInitialFields,
  deleteWikiDraft,
  fetchManagedWikiDraftWikis,
  fetchMyWikiDraftWikis,
  fetchVersionInconsistentWikis,
  publishWikiDraft,
  rejectWikiDraft,
  translateWikiDraft,
  withdrawWikiDraft,
} from "@/gateways/wiki/draftWiki";
import {
  approveWikiDraftImage,
  approveWikiImageDeletionRequest,
  fetchWikiDraftImages,
  fetchWikiImageDeletionRequests,
  rejectWikiDraftImage,
  rejectWikiImageDeletionRequest,
} from "@/gateways/wiki/wikiImageBrowserApi";
import {
  fetchMyOfficialCertificationsFromBrowser,
  fetchMyOwnedWikisFromBrowser,
  fetchOfficialCertificationReviews,
  requestOfficialCertificationFromBrowser,
  reviewOfficialCertificationFromBrowser,
  syncOwnedWikiCertificationsFromBrowser,
} from "@/gateways/wiki/officialCertification";
import {
  canAutoCreateWikiDraftWikiResourceType,
  canManageWikiPrincipalGroups,
  canPublishWikiDraftWikis,
  canReviewOfficialCertifications,
  canReviewWikiDraftImages,
  canReviewWikiDraftWikis,
  canReviewWikiImageDeletionRequests,
  createWikiPrincipal,
  draftWikiAutoCreateResourceTypes,
  getCurrentWikiPrincipal,
  getOfficialCertificationRequestResourceTypesForAccountCategory,
  type WikiPrincipalState,
} from "@/gateways/wiki/wikiPrincipal";
import { buildWikiEditPath, normalizeWikiSlugForResourceType, type WikiResourceType } from "@kpool/wiki";
import type { Locale } from "../../../i18n/locales";
import { useAdminWikiPrincipal } from "../useAdminWikiPrincipal";
import { type AdminWikiTab, adminWikiTabRoutes } from "../adminTypes";
import { useAdmin } from "../AdminProvider";
import {
  CreateDraftWikiDialog,
} from "./WikiContentClient";
import { WikiLayoutClient } from "./WikiLayoutClient";
import { WikiSectionProvider } from "./WikiSectionProvider";

type CreateDraftWikiMode = "manual" | "auto";

type CreateDraftWikiDialogState = {
  error: string | null;
  isCreating: boolean;
  isOpen: boolean;
};

const defaultPrincipalAdapter: AdminPrincipalAdapter = {
  createPrincipal: createWikiPrincipal,
  getCurrentPrincipal: getCurrentWikiPrincipal,
};

export const defaultAdminDraftImageAdapter: AdminDraftImageAdapter = {
  approveDraftImage: approveWikiDraftImage,
  approveImageDeletionRequest: approveWikiImageDeletionRequest,
  listDraftImages: fetchWikiDraftImages,
  listImageDeletionRequests: fetchWikiImageDeletionRequests,
  rejectDraftImage: rejectWikiDraftImage,
  rejectImageDeletionRequest: rejectWikiImageDeletionRequest,
};

export const defaultAdminDraftWikiAdapter: AdminDraftWikiAdapter = {
  approveDraftWiki: approveWikiDraft,
  deleteDraftWiki: deleteWikiDraft,
  listManagedDraftWikis: fetchManagedWikiDraftWikis,
  listMyDraftWikis: fetchMyWikiDraftWikis,
  listUntranslatedWikis: fetchVersionInconsistentWikis,
  publishDraftWiki: publishWikiDraft,
  rejectDraftWiki: rejectWikiDraft,
  translateDraftWiki: translateWikiDraft,
  withdrawDraftWiki: withdrawWikiDraft,
};

export const defaultOfficialCertificationAdapter: AdminOfficialCertificationAdapter = {
  listOfficialCertifications: fetchOfficialCertificationReviews,
  listMyOfficialCertifications: fetchMyOfficialCertificationsFromBrowser,
  listMyOwnedWikis: fetchMyOwnedWikisFromBrowser,
  requestOfficialCertification: requestOfficialCertificationFromBrowser,
  reviewOfficialCertification: reviewOfficialCertificationFromBrowser,
  syncOwnedWikiCertifications: syncOwnedWikiCertificationsFromBrowser,
};

const isActionPending = (state: WikiPrincipalState): boolean =>
  state.status === "loading";

type WikiSectionClientProps = {
  children: ReactNode;
  draftImageAdapter?: AdminDraftImageAdapter;
  draftWikiAdapter?: AdminDraftWikiAdapter;
  officialCertificationAdapter?: AdminOfficialCertificationAdapter;
  principalAdapter?: AdminPrincipalAdapter;
  returnTo?: string | null;
};

export function WikiSectionClient({
  children,
  draftImageAdapter = defaultAdminDraftImageAdapter,
  draftWikiAdapter = defaultAdminDraftWikiAdapter,
  officialCertificationAdapter = defaultOfficialCertificationAdapter,
  principalAdapter = defaultPrincipalAdapter,
  returnTo = null,
}: WikiSectionClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    currentIdentity,
    initialPrincipalState,
    locale,
    refreshIdentity,
    t,
  } = useAdmin();
  const activeWikiTab = resolveActiveWikiTab(pathname);
  const [createDialog, setCreateDialog] = useState<CreateDraftWikiDialogState>({
    error: null,
    isCreating: false,
    isOpen: false,
  });
  const loadFirstDraftWikiPage = useCallback(
    () => {
      (router as { refresh?: () => void }).refresh?.();
    },
    [router],
  );
  const handlePrincipalReady = useCallback(() => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }

    return loadFirstDraftWikiPage();
  }, [loadFirstDraftWikiPage, returnTo, router]);
  const principalMessages = useMemo(() => ({
    accountUnavailableMessage: t.accountUnavailableMessage,
    identityUnavailableMessage: t.identityUnavailableMessage,
  }), [t.accountUnavailableMessage, t.identityUnavailableMessage]);
  const {
    activateWikiPrincipal,
    loadCurrentPrincipal,
    principalState,
  } = useAdminWikiPrincipal({
    adapter: principalAdapter,
    initialIdentity: currentIdentity,
    initialPrincipalState,
    messages: principalMessages,
    onPrincipalReady: handlePrincipalReady,
    refreshIdentity,
  });
  const autoCreatableResourceTypes = useMemo(
    () =>
      principalState.status === "available"
        ? draftWikiAutoCreateResourceTypes.filter((resourceType) =>
            canAutoCreateWikiDraftWikiResourceType(principalState.principal, resourceType),
          )
        : [],
    [principalState],
  );
  const openCreateDialog = () => {
    setCreateDialog({
      error: null,
      isCreating: false,
      isOpen: true,
    });
  };
  const closeCreateDialog = () => {
    setCreateDialog((state) => state.isCreating
      ? state
      : {
          ...state,
          error: null,
          isOpen: false,
        });
  };
  useEffect(() => {
    if (principalState.status !== "available") {
      return;
    }

    const canReviewDraftImages = canReviewWikiDraftImages(principalState.principal);
    const canReviewImageDeletionRequests = canReviewWikiImageDeletionRequests(principalState.principal);
    const canReviewDraftWikis = canReviewWikiDraftWikis(principalState.principal);
    const canReviewOfficialCertificationRequests = canReviewOfficialCertifications(principalState.principal);
    const canPublishDraftWikis = canPublishWikiDraftWikis(principalState.principal);
    const canManagePrincipalGroups = canManageWikiPrincipalGroups(principalState.principal);
    const isAllowed =
      activeWikiTab === "editingWikis" ||
      (activeWikiTab === "submittedWikis" || activeWikiTab === "officialCertificationRequest") ||
      (activeWikiTab === "unapprovedWikis" && canReviewDraftWikis) ||
      (activeWikiTab === "officialCertificationReview" && canReviewOfficialCertificationRequests) ||
      ((activeWikiTab === "approvedWikis" || activeWikiTab === "untranslatedWikis") && canPublishDraftWikis) ||
      (activeWikiTab === "draftImages" && canReviewDraftImages) ||
      (activeWikiTab === "imageDeletionRequests" && canReviewImageDeletionRequests) ||
      (activeWikiTab === "principalGroupManagement" && canManagePrincipalGroups);

    if (!isAllowed) {
      router.replace(adminWikiTabRoutes.editingWikis);
    }
  }, [activeWikiTab, principalState, router]);

  const submitCreateDialog = (input: {
    agencyIdentifier: string | null;
    groupIdentifiers: string[];
    language: Locale;
    mode: CreateDraftWikiMode;
    name: string;
    resourceType: WikiResourceType;
    slug: string;
    talentIdentifiers: string[];
  }) => {
    const slug = normalizeWikiSlugForResourceType(input.slug, input.resourceType);

    setCreateDialog((state) => ({
      ...state,
      error: null,
      isCreating: true,
    }));

    const request = input.mode === "auto"
      ? autoCreateWiki({
          fallbackErrorMessage: t.createWikiFailed,
          requestBody: createAutoCreateWikiRequestBodyFromInitialFields({
            agencyIdentifier: input.agencyIdentifier,
            groupIdentifiers: input.groupIdentifiers,
            language: input.language,
            name: input.name,
            resourceType: input.resourceType,
            slug,
            talentIdentifiers: input.talentIdentifiers,
          }),
        })
      : createWiki({
          fallbackErrorMessage: t.createWikiFailed,
          requestBody: createWikiRequestBodyFromInitialFields({
            language: input.language,
            name: input.name,
            resourceType: input.resourceType,
            slug,
          }),
        });

    void request.then(() => {
      router.push(buildWikiEditPath(input.language, slug));
    }).catch((error: unknown) => {
      setCreateDialog({
        error: error instanceof Error ? error.message : t.createWikiFailed,
        isCreating: false,
        isOpen: true,
      });
    });
  };

  return (
    <>
      <WikiLayoutClient
        isAuthenticated={currentIdentity !== null}
        isPending={isActionPending(principalState)}
        selectedWikiTab={activeWikiTab}
        state={principalState}
        t={t}
        onActivate={() => void activateWikiPrincipal()}
        onRetry={() => void loadCurrentPrincipal()}
        onOpenCreateDraftWiki={openCreateDialog}
        officialCertificationRequestResourceTypes={getOfficialCertificationRequestResourceTypesForAccountCategory(
          getAccountCategoryFromIdentity(currentIdentity),
        )}
      >
        {(resolvedWikiTab) => (
          <WikiSectionProvider
            value={{
              activeWikiTab: resolvedWikiTab,
              draftImageAdapter,
              draftWikiAdapter,
              officialCertificationAdapter,
              principalState,
            }}
          >
            {children}
          </WikiSectionProvider>
        )}
      </WikiLayoutClient>
      <CreateDraftWikiDialog
        autoCreatableResourceTypes={autoCreatableResourceTypes}
        error={createDialog.error}
        isCreating={createDialog.isCreating}
        isOpen={createDialog.isOpen}
        locale={locale}
        t={t}
        onClose={closeCreateDialog}
        onSubmit={submitCreateDialog}
      />
    </>
  );
}

const resolveActiveWikiTab = (pathname: string | null): AdminWikiTab => {
  if (pathname?.endsWith("/submitted")) {
    return "submittedWikis";
  }

  if (pathname?.endsWith("/approved")) {
    return "approvedWikis";
  }

  if (pathname?.endsWith("/unapproved")) {
    return "unapprovedWikis";
  }

  if (pathname?.endsWith("/untranslated")) {
    return "untranslatedWikis";
  }

  if (pathname?.endsWith("/draft-images")) {
    return "draftImages";
  }

  if (pathname?.endsWith("/image-deletion-requests")) {
    return "imageDeletionRequests";
  }

  if (pathname?.endsWith("/official-certification/request")) {
    return "officialCertificationRequest";
  }

  if (pathname?.endsWith("/official-certification/review")) {
    return "officialCertificationReview";
  }

  if (pathname?.endsWith("/principal-groups")) {
    return "principalGroupManagement";
  }

  return "editingWikis";
};
