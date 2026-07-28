"use client";

import { usePathname } from "next/navigation";

import { AccountInvitationsClient } from "../account/invitations/AccountInvitationsClient";
import { AccountPrincipalGroupsClient } from "../account/principal-groups/AccountPrincipalGroupsClient";
import { AccountProfileClient } from "../account/profile/AccountProfileClient";
import { AccountPageClient } from "../account/AccountPageClient";
import { MyPageShellClient } from "../MyPageShellClient";
import { MypageProvider } from "../MypageProvider";
import type { MyPageRouteContext } from "../myPageTypes";
import { UserLanguageClient } from "../user/language/UserLanguageClient";
import { UserPageClient } from "../user/UserPageClient";
import { UserProfileClient } from "../user/profile/UserProfileClient";
import { ApprovedWikisClient } from "../wiki/approved/ApprovedWikisClient";
import { DraftImagesClient } from "../wiki/draft-images/DraftImagesClient";
import { EditingWikisClient } from "../wiki/editing/EditingWikisClient";
import { ImageDeletionRequestsClient } from "../wiki/image-deletion-requests/ImageDeletionRequestsClient";
import { SubmittedWikisClient } from "../wiki/submitted/SubmittedWikisClient";
import { UnapprovedWikisClient } from "../wiki/unapproved/UnapprovedWikisClient";
import { UntranslatedWikisClient } from "../wiki/untranslated/UntranslatedWikisClient";
import { WikiSectionClient } from "../wiki/WikiSectionClient";

type MypageAppClientProps = {
  context: MyPageRouteContext;
  returnTo?: string | null;
};

export function MypageAppClient({
  context,
  returnTo = null,
}: MypageAppClientProps) {
  const pathname = usePathname();
  const page = resolveMypageClientPage(pathname);

  return (
    <MypageProvider initialContext={context}>
      <MyPageShellClient>
        <MypageResolvedPage page={page} returnTo={returnTo} />
      </MyPageShellClient>
    </MypageProvider>
  );
}

type MypageClientPage = "accountInvitations"
  | "accountPrincipalGroups"
  | "accountProfile"
  | "userLanguage"
  | "userProfile"
  | "wikiApproved"
  | "wikiDraftImages"
  | "wikiEditing"
  | "wikiImageDeletionRequests"
  | "wikiSubmitted"
  | "wikiUnapproved"
  | "wikiUntranslated";

const resolveMypageClientPage = (pathname: string | null): MypageClientPage => {
  if (pathname?.startsWith("/mypage/account")) {
    if (pathname.endsWith("/invitations")) {
      return "accountInvitations";
    }

    if (pathname.endsWith("/principal-groups")) {
      return "accountPrincipalGroups";
    }

    return "accountProfile";
  }

  if (pathname?.startsWith("/mypage/user")) {
    return pathname.endsWith("/language") ? "userLanguage" : "userProfile";
  }

  if (pathname?.endsWith("/submitted")) {
    return "wikiSubmitted";
  }

  if (pathname?.endsWith("/approved")) {
    return "wikiApproved";
  }

  if (pathname?.endsWith("/unapproved")) {
    return "wikiUnapproved";
  }

  if (pathname?.endsWith("/untranslated")) {
    return "wikiUntranslated";
  }

  if (pathname?.endsWith("/draft-images")) {
    return "wikiDraftImages";
  }

  if (pathname?.endsWith("/image-deletion-requests")) {
    return "wikiImageDeletionRequests";
  }

  return "wikiEditing";
};

function MypageResolvedPage({
  page,
  returnTo,
}: {
  page: MypageClientPage;
  returnTo: string | null;
}) {
  if (page === "accountInvitations") {
    return (
      <AccountPageClient activeTab="accountInvitations">
        <AccountInvitationsClient />
      </AccountPageClient>
    );
  }

  if (page === "accountPrincipalGroups") {
    return (
      <AccountPageClient activeTab="principalGroupManagement">
        <AccountPrincipalGroupsClient />
      </AccountPageClient>
    );
  }

  if (page === "accountProfile") {
    return (
      <AccountPageClient activeTab="accountProfile">
        <AccountProfileClient />
      </AccountPageClient>
    );
  }

  if (page === "userLanguage") {
    return (
      <UserPageClient activeSettingsTab="languageSettings">
        <UserLanguageClient />
      </UserPageClient>
    );
  }

  if (page === "userProfile") {
    return (
      <UserPageClient activeSettingsTab="profileSettings">
        <UserProfileClient />
      </UserPageClient>
    );
  }

  return (
    <WikiSectionClient returnTo={returnTo}>
      {page === "wikiSubmitted" ? (
        <SubmittedWikisClient />
      ) : page === "wikiApproved" ? (
        <ApprovedWikisClient />
      ) : page === "wikiUnapproved" ? (
        <UnapprovedWikisClient />
      ) : page === "wikiUntranslated" ? (
        <UntranslatedWikisClient />
      ) : page === "wikiDraftImages" ? (
        <DraftImagesClient />
      ) : page === "wikiImageDeletionRequests" ? (
        <ImageDeletionRequestsClient />
      ) : (
        <EditingWikisClient />
      )}
    </WikiSectionClient>
  );
}
