import type { AccountSummary } from "@/gateways/account/accountApi";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import type { WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import type { Locale } from "../../i18n/locales";
import type { DraftImageListState } from "./useAdminDraftImageReview";
import type { DraftWikiListState, AdminDraftWikiActionTab } from "./useAdminDraftWikis";
import type { ImageDeletionRequestListState } from "./useAdminImageDeletionRequestReview";

export type AdminSettingsTab = "profileSettings" | "languageSettings";
export type AdminAccountSettingsTab = "accountProfile" | "accountInvitations" | "accountDocuments" | "accountCategoryChange" | "accountAffiliations" | "principalGroupManagement" | "unapprovedAccountCategoryChangeRequests";
export type AdminSection = "wiki" | "accountSettings" | "settings";
export type AdminWikiTab = AdminDraftWikiActionTab | "draftImages" | "imageDeletionRequests" | "officialCertificationRequest" | "officialCertificationReview" | "principalGroupManagement";

export type AdminRouteContext = {
  initialDraftImages: DraftImageListState;
  initialDraftWikis: Record<AdminDraftWikiActionTab, DraftWikiListState>;
  initialIdentity: IdentitySummary;
  initialImageDeletionRequests: ImageDeletionRequestListState;
  initialPrincipalState: WikiPrincipalState;
};

export type AdminAccountSettingsState = {
  account: AccountSummary | null;
  accountName: string;
  address: {
    administrativeAreaCode: string;
    addressLine1: string;
    addressLine2: string;
    countryCode: string;
    locality: string;
    postalCode: string;
  };
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  phone: string;
  success: string | null;
};

export type AdminAccountInvitationState = {
  emailInput: string;
  emails: string[];
  error: string | null;
  isSending: boolean;
  success: string | null;
};

export type AdminIdentitySettingsState = {
  error: string | null;
  imagePreview: string | null;
  imageReadError: string | null;
  imageCropState: { file: File; sourceDataUrl: string } | null;
  identityName: string;
  isSaving: boolean;
  language: Locale;
  profileImageMarkedForDeletion: boolean;
  profileImageBase64: string | null;
  syncError: string | null;
  success: string | null;
};

export const adminSectionRoutes: Record<AdminSection, string> = {
  accountSettings: "/admin/account/profile",
  settings: "/admin/user/profile",
  wiki: "/admin/wiki/editing",
};

export const adminWikiTabRoutes: Record<AdminWikiTab, string> = {
  editingWikis: "/admin/wiki/editing",
  submittedWikis: "/admin/wiki/submitted",
  unapprovedWikis: "/admin/wiki/unapproved",
  approvedWikis: "/admin/wiki/approved",
  untranslatedWikis: "/admin/wiki/untranslated",
  draftImages: "/admin/wiki/draft-images",
  imageDeletionRequests: "/admin/wiki/image-deletion-requests",
  officialCertificationRequest: "/admin/wiki/official-certification/request",
  officialCertificationReview: "/admin/wiki/official-certification/review",
  principalGroupManagement: "/admin/wiki/principal-groups",
};

export const adminAccountTabRoutes: Record<AdminAccountSettingsTab, string> = {
  accountDocuments: "/admin/account/documents",
  accountInvitations: "/admin/account/invitations",
  accountCategoryChange: "/admin/account/category-change",
  accountAffiliations: "/admin/account/affiliations",
  accountProfile: "/admin/account/profile",
  principalGroupManagement: "/admin/account/principal-groups",
  unapprovedAccountCategoryChangeRequests: "/admin/account/category-change-requests",
};

export const adminSettingsTabRoutes: Record<AdminSettingsTab, string> = {
  languageSettings: "/admin/user/language",
  profileSettings: "/admin/user/profile",
};
