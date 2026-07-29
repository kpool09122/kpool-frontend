import type { AccountSummary } from "@/gateways/account/accountApi";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import type { WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import type { Locale } from "../../i18n/locales";
import type { DraftImageListState } from "./useAdminDraftImageReview";
import type { DraftWikiListState, AdminDraftWikiActionTab } from "./useAdminDraftWikis";
import type { ImageDeletionRequestListState } from "./useAdminImageDeletionRequestReview";

export type AdminSettingsTab = "profileSettings" | "languageSettings";
export type AdminAccountSettingsTab = "accountProfile" | "accountInvitations" | "principalGroupManagement";
export type AdminSection = "wiki" | "accountSettings" | "settings";
export type AdminWikiTab = AdminDraftWikiActionTab | "draftImages" | "imageDeletionRequests";

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
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
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
  approvedWikis: "/admin/wiki/approved",
  draftImages: "/admin/wiki/draft-images",
  editingWikis: "/admin/wiki/editing",
  imageDeletionRequests: "/admin/wiki/image-deletion-requests",
  submittedWikis: "/admin/wiki/submitted",
  unapprovedWikis: "/admin/wiki/unapproved",
  untranslatedWikis: "/admin/wiki/untranslated",
};

export const adminAccountTabRoutes: Record<AdminAccountSettingsTab, string> = {
  accountInvitations: "/admin/account/invitations",
  accountProfile: "/admin/account/profile",
  principalGroupManagement: "/admin/account/principal-groups",
};

export const adminSettingsTabRoutes: Record<AdminSettingsTab, string> = {
  languageSettings: "/admin/user/language",
  profileSettings: "/admin/user/profile",
};
