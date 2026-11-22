import {
  canPublishWikiDraftWikis,
  canTranslateWikis,
  canManageOfficialCertifications,
  canReviewOfficialCertifications,
  canReviewWikiDraftImages,
  canManageWikiImages,
  canReviewWikiDraftWikis,
  canReviewWikiImageDeletionRequests,
  type WikiPrincipalSummary,
} from "@/gateways/wiki/wikiPrincipal";
import { canShowWikiPrincipalGroupManagement } from "../principalGroupVisibility";
import type { useI18n } from "../../../i18n/I18nProvider";
import { adminWikiTabRoutes, type AdminWikiTab } from "../adminTypes";

type AdminCopy = ReturnType<typeof useI18n>["dictionary"]["admin"];
export type WikiCategory = "wiki" | "certification" | "images" | "video";
const categoryTabs: Record<WikiCategory, readonly AdminWikiTab[]> = {
  wiki: ["editingWikis", "submittedWikis", "unapprovedWikis", "approvedWikis", "untranslatedWikis", "principalGroupManagement"],
  certification: ["officialCertificationRequest", "officialCertificationReview"],
  images: ["managedImages", "draftImages", "imageDeletionRequests"],
  video: ["playlists", "watchRequests"],
};
export function getWikiCategory(tab: AdminWikiTab): WikiCategory {
  return (Object.keys(categoryTabs) as WikiCategory[]).find((category) => categoryTabs[category].includes(tab))!;
}
export function resolveWikiCategory(pathname: string | null): WikiCategory {
  const tab = (Object.keys(adminWikiTabRoutes) as AdminWikiTab[])
    .sort((a, b) => adminWikiTabRoutes[b].length - adminWikiTabRoutes[a].length)
    .find((tab) => pathname === adminWikiTabRoutes[tab] || pathname?.startsWith(`${adminWikiTabRoutes[tab]}/`));
  return getWikiCategory(tab ?? "editingWikis");
}
const createWikiTab = (id: AdminWikiTab, label: string) => ({ id, label });
export function getWikiNavigationGroups(principal: WikiPrincipalSummary, t: AdminCopy, canViewOfficialVideoInbox = false) {
  const canReviewDraftImages = canReviewWikiDraftImages(principal);
  const canReviewImageDeletionRequests = canReviewWikiImageDeletionRequests(principal);
  const canReviewDraftWikis = canReviewWikiDraftWikis(principal);
  const canPublishDraftWikis = canPublishWikiDraftWikis(principal);
  const canTranslate = canTranslateWikis(principal);
  const canManagePrincipalGroups = canShowWikiPrincipalGroupManagement(principal);
  const canRequestOfficialCertification = canManageOfficialCertifications(principal);

  const tabs: Array<{ id: AdminWikiTab; label: string }> = [
    createWikiTab("editingWikis", t.editingWikisTab),
    createWikiTab("submittedWikis", t.submittedWikisTab),
    ...(canReviewDraftWikis ? [createWikiTab("unapprovedWikis", t.unapprovedWikisTab)] : []),
    ...(canPublishDraftWikis ? [createWikiTab("approvedWikis", t.approvedWikisTab)] : []),
    ...(canTranslate ? [createWikiTab("untranslatedWikis", t.untranslatedWikisTab)] : []),
    ...(canManageWikiImages(principal) ? [createWikiTab("managedImages", t.managedImages.title)] : []),
    ...(canReviewDraftImages ? [createWikiTab("draftImages", t.draftImagesTab)] : []),
    ...(canReviewImageDeletionRequests ? [createWikiTab("imageDeletionRequests", t.imageDeletionRequestsTab)] : []),
    ...(canRequestOfficialCertification ? [createWikiTab("officialCertificationRequest", t.officialCertificationRequestTab)] : []),
    ...(canReviewOfficialCertifications(principal) ? [createWikiTab("officialCertificationReview", t.officialCertificationReviewTab)] : []),
    createWikiTab("playlists", t.playlists.title),
    ...(canViewOfficialVideoInbox ? [createWikiTab("watchRequests", t.officialVideoInbox.title)] : []),
    ...(canManagePrincipalGroups ? [createWikiTab("principalGroupManagement", t.wikiPrincipalGroupManagementTab)] : []),
  ];
  return (Object.keys(categoryTabs) as WikiCategory[]).flatMap((id) => {
    const visibleTabs = tabs.filter((tab) => categoryTabs[id].includes(tab.id));
    return visibleTabs.length ? [{ id, label: t.wikiCategories[id], tabs: visibleTabs, href: adminWikiTabRoutes[visibleTabs[0].id] }] : [];
  });
}
