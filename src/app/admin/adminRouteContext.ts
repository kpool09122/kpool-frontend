import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { loadAdminIdentity } from "./adminIdentity";
import { getAdminAccountScope } from "./accountScope";
import {
  isAccountActive,
  isAccountSetupRequired,
  isAccountStatusUnavailable,
} from "@/gateways/identity/identityApi";
import {
  createInitialDraftWikis,
  loadInitialDraftWikiListForRequest,
  type InitialDraftWikiListTab,
} from "@/gateways/wiki/draftWiki";
import {
  loadInitialWikiDraftImagesForRequest,
  loadInitialWikiImageDeletionRequestsForRequest,
} from "@/gateways/wiki/wikiImageBrowserApi";
import { loadAdminWikiPrincipalSnapshot } from "./adminWikiPrincipal";
import type { DraftImageListState } from "./useAdminDraftImageReview";
import type { ImageDeletionRequestListState } from "./useAdminImageDeletionRequestReview";
import type { AdminWikiTab } from "./adminTypes";
import { resolveAdminDestination } from "./adminNavigation";

export const dynamic = "force-dynamic";

type AdminRouteDataTarget =
  | { section: "account" | "user" | "site-management" }
  | { section: "wiki"; tab: AdminWikiTab };

export async function loadAdminRouteContext(
  loginReturnTo: string,
  slug: string[] | undefined,
) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const target = resolveAdminRouteDataTarget(slug);
  const authenticatedIdentity = await loadAdminIdentity();

  if (!authenticatedIdentity) {
    redirect(`/login?returnTo=${encodeURIComponent(loginReturnTo)}`);
  }

  const pathname = slug?.length ? `/admin/${slug.join("/")}` : "/admin/wiki/editing";
  const snapshot = await loadAdminWikiPrincipalSnapshot();
  const principalState = snapshot.state;
  const destination = resolveAdminDestination(authenticatedIdentity, pathname, principalState);
  if (destination !== pathname && !isAccountSetupRequired(authenticatedIdentity) && !isAccountStatusUnavailable(authenticatedIdentity)) {
    redirect(destination);
  }

  if (!isAccountActive(authenticatedIdentity)) {
    return {
      accountScope: getAdminAccountScope(authenticatedIdentity),
      initialDraftImages: createInitialDraftImageListState(),
      initialDraftWikis: createInitialDraftWikis(),
      initialImageDeletionRequests: createInitialImageDeletionRequestListState(),
      initialPrincipalState: principalState,
      principalStateUpdatedAt: snapshot.updatedAt,
    };
  }

  const initialDraftWikis = createInitialDraftWikis();
  let initialDraftImages = createInitialDraftImageListState();
  let initialImageDeletionRequests = createInitialImageDeletionRequestListState();

  if (principalState.status === "available" && target.section === "wiki") {
    if (isDraftWikiInitialDataTab(target.tab)) {
      initialDraftWikis[target.tab] = await loadInitialDraftWikiListForRequest(cookieHeader, target.tab);
    }

    if (target.tab === "draftImages") {
      const page = await loadInitialWikiDraftImagesForRequest(cookieHeader);
      initialDraftImages = page ? toDraftImageListState(page) : createInitialDraftImageListState();
    }

    if (target.tab === "imageDeletionRequests") {
      const page = await loadInitialWikiImageDeletionRequestsForRequest(cookieHeader);
      initialImageDeletionRequests = page
        ? toImageDeletionRequestListState(page)
        : createInitialImageDeletionRequestListState();
    }
  }

  return {
    accountScope: getAdminAccountScope(authenticatedIdentity),
    initialDraftImages,
    initialDraftWikis,
    initialImageDeletionRequests,
    initialPrincipalState: principalState,
    principalStateUpdatedAt: snapshot.updatedAt,
  };
}

const resolveAdminRouteDataTarget = (slug: string[] | undefined): AdminRouteDataTarget => {
  if (slug?.[0] === "site-management") return { section: "site-management" };
  if (slug?.[0] === "account") {
    return { section: "account" };
  }

  if (slug?.[0] === "user") {
    return { section: "user" };
  }

  return {
    section: "wiki",
    tab: resolveAdminWikiTab(slug),
  };
};

const resolveAdminWikiTab = (slug: string[] | undefined): AdminWikiTab => {
  const wikiPage = slug?.[0] === "wiki" ? slug[1] : undefined;

  if (wikiPage === "submitted") {
    return "submittedWikis";
  }

  if (wikiPage === "approved") {
    return "approvedWikis";
  }

  if (wikiPage === "unapproved") {
    return "unapprovedWikis";
  }

  if (wikiPage === "untranslated") {
    return "untranslatedWikis";
  }

  if (wikiPage === "draft-images") {
    return "draftImages";
  }

  if (wikiPage === "image-deletion-requests") {
    return "imageDeletionRequests";
  }

  if (wikiPage === "principal-groups") {
    return "principalGroupManagement";
  }

  return "editingWikis";
};

const isDraftWikiInitialDataTab = (tab: AdminWikiTab): tab is InitialDraftWikiListTab =>
  tab !== "draftImages" && tab !== "imageDeletionRequests" && tab !== "principalGroupManagement";

const createInitialDraftImageListState = (): DraftImageListState => ({
  images: [],
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
});

const createInitialImageDeletionRequestListState = (): ImageDeletionRequestListState => ({
  images: [],
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
});

const toDraftImageListState = (
  page: Awaited<ReturnType<typeof loadInitialWikiDraftImagesForRequest>>,
): DraftImageListState => page
  ? {
      images: page.images,
      isInitialLoading: false,
      isLoadingMore: false,
      loadError: null,
      pageInfo: {
        current_page: page.current_page,
        last_page: page.last_page,
        total: page.total,
      },
    }
  : createInitialDraftImageListState();

const toImageDeletionRequestListState = (
  page: Awaited<ReturnType<typeof loadInitialWikiImageDeletionRequestsForRequest>>,
): ImageDeletionRequestListState => page
  ? {
      images: page.images,
      isInitialLoading: false,
      isLoadingMore: false,
      loadError: null,
      pageInfo: {
        current_page: page.current_page,
        last_page: page.last_page,
        total: page.total,
      },
    }
  : createInitialImageDeletionRequestListState();
