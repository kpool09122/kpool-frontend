import type { AccountSummary } from "@/gateways/account/accountApi";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import type { WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import type { Locale } from "../../i18n/locales";
import type { DraftImageListState } from "./useMyPageDraftImageReview";
import type { DraftWikiListState, MyPageDraftWikiActionTab } from "./useMyPageDraftWikis";
import type { ImageDeletionRequestListState } from "./useMyPageImageDeletionRequestReview";

export type MyPageSettingsTab = "profileSettings" | "languageSettings";
export type MyPageAccountSettingsTab = "accountProfile" | "accountInvitations" | "principalGroupManagement";
export type MyPageSection = "wiki" | "accountSettings" | "settings";
export type MyPageWikiTab = MyPageDraftWikiActionTab | "draftImages" | "imageDeletionRequests";

export type MyPageRouteContext = {
  initialDraftImages: DraftImageListState;
  initialDraftWikis: Record<MyPageDraftWikiActionTab, DraftWikiListState>;
  initialIdentity: IdentitySummary;
  initialImageDeletionRequests: ImageDeletionRequestListState;
  initialPrincipalState: WikiPrincipalState;
};

export type MyPageAccountSettingsState = {
  account: AccountSummary | null;
  accountName: string;
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  success: string | null;
};

export type MyPageAccountInvitationState = {
  emailInput: string;
  emails: string[];
  error: string | null;
  isSending: boolean;
  success: string | null;
};

export type MyPageIdentitySettingsState = {
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

export const myPageSectionRoutes: Record<MyPageSection, string> = {
  accountSettings: "/mypage/account/profile",
  settings: "/mypage/user/profile",
  wiki: "/mypage/wiki/editing",
};

export const myPageWikiTabRoutes: Record<MyPageWikiTab, string> = {
  approvedWikis: "/mypage/wiki/approved",
  draftImages: "/mypage/wiki/draft-images",
  editingWikis: "/mypage/wiki/editing",
  imageDeletionRequests: "/mypage/wiki/image-deletion-requests",
  submittedWikis: "/mypage/wiki/submitted",
  unapprovedWikis: "/mypage/wiki/unapproved",
  untranslatedWikis: "/mypage/wiki/untranslated",
};

export const myPageAccountTabRoutes: Record<MyPageAccountSettingsTab, string> = {
  accountInvitations: "/mypage/account/invitations",
  accountProfile: "/mypage/account/profile",
  principalGroupManagement: "/mypage/account/principal-groups",
};

export const myPageSettingsTabRoutes: Record<MyPageSettingsTab, string> = {
  languageSettings: "/mypage/user/language",
  profileSettings: "/mypage/user/profile",
};
