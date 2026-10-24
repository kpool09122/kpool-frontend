"use client";

import { usePathname } from "next/navigation";
import { SiteManagementAnnouncementsClient } from "../site-management/announcements/SiteManagementAnnouncementsClient";
import { SiteManagementPrincipalGroupsClient } from "../site-management/principal-groups/SiteManagementPrincipalGroupsClient";
import { SiteManagementPageClient } from "../site-management/SiteManagementPageClient";
import { SiteManagementContactsClient } from "../site-management/contacts/SiteManagementContactsClient";

import { AccountAffiliationsClient } from "../account/affiliations/AccountAffiliationsClient";
import { AccountCategoryChangeClient } from "../account/category-change/AccountCategoryChangeClient";
import { AccountCategoryChangeRequestDetailClient } from "../account/category-change-requests/[requestId]/AccountCategoryChangeRequestDetailClient";
import { AccountCategoryChangeRequestsClient } from "../account/category-change-requests/AccountCategoryChangeRequestsClient";
import { AccountDocumentsClient } from "../account/documents/AccountDocumentsClient";
import { AccountDelegationsClient } from "../account/delegations/AccountDelegationsClient";
import { AccountInvitationsClient } from "../account/invitations/AccountInvitationsClient";
import { AccountPrincipalGroupsClient } from "../account/principal-groups/AccountPrincipalGroupsClient";
import { AccountNotificationsClient } from "../account/notification-settings/AccountNotificationsClient";
import { AccountProfileClient } from "../account/profile/AccountProfileClient";
import { AccountPageClient } from "../account/AccountPageClient";
import { AdminRouteProvider } from "../AdminRouteProvider";
import type { AdminRouteData } from "../adminTypes";
import { UserLanguageClient } from "../user/language/UserLanguageClient";
import { UserOtherClient } from "../user/other/UserOtherClient";
import { UserPageClient } from "../user/UserPageClient";
import { UserProfileClient } from "../user/profile/UserProfileClient";
import { UserSecurityClient } from "../user/security/UserSecurityClient";
import { ApprovedWikisClient } from "../wiki/approved/ApprovedWikisClient";
import { DraftImagesClient } from "../wiki/draft-images/DraftImagesClient";
import { EditingWikisClient } from "../wiki/editing/EditingWikisClient";
import { ImageDeletionRequestsClient } from "../wiki/image-deletion-requests/ImageDeletionRequestsClient";
import { OfficialCertificationRequestClient } from "../wiki/official-certification/request/OfficialCertificationRequestClient";
import { OfficialCertificationReviewClient } from "../wiki/official-certification/review/OfficialCertificationReviewClient";
import { SubmittedWikisClient } from "../wiki/submitted/SubmittedWikisClient";
import { UnapprovedWikisClient } from "../wiki/unapproved/UnapprovedWikisClient";
import { UntranslatedWikisClient } from "../wiki/untranslated/UntranslatedWikisClient";
import { WikiSectionClient } from "../wiki/WikiSectionClient";
import { WikiPrincipalGroupsClient } from "../wiki/principal-groups/WikiPrincipalGroupsClient";

type AdminAppClientProps = {
  data: AdminRouteData;
  returnTo?: string | null;
};

export function AdminAppClient({ data, returnTo = null }: AdminAppClientProps) {
  const page = resolveAdminClientPage(usePathname());

  return (
    <AdminRouteProvider value={data}>
      <AdminResolvedPage page={page} returnTo={returnTo} />
    </AdminRouteProvider>
  );
}

type AdminClientPage = "accountAffiliations"
  | "siteManagementContacts"
  | "siteManagementPrincipalGroups"
  | "siteManagementAnnouncements"
  | "accountDelegations"
  | "accountCategoryChange"
  | "accountCategoryChangeRequestDetail"
  | "accountCategoryChangeRequests"
  | "accountNotifications"
  | "accountDocuments"
  | "accountInvitations"
  | "accountPrincipalGroups"
  | "accountProfile"
  | "userLanguage"
  | "userOther"
  | "userProfile"
  | "userSecurity"
  | "wikiApproved"
  | "wikiDraftImages"
  | "wikiEditing"
  | "wikiImageDeletionRequests"
  | "wikiOfficialCertificationRequest"
  | "wikiOfficialCertificationReview"
  | "wikiPrincipalGroups"
  | "wikiSubmitted"
  | "wikiUnapproved"
  | "wikiUntranslated";

export const resolveAdminClientPage = (pathname: string | null): AdminClientPage => {
  if (pathname === "/admin/site-management/announcements") return "siteManagementAnnouncements";
  if (pathname === "/admin/site-management" || pathname === "/admin/site-management/") return "siteManagementContacts";
  if (pathname === "/admin/site-management/contacts" || pathname === "/admin/site-management/contacts/manage" || pathname === "/admin/site-management/contacts/unanswered") return "siteManagementContacts";
  if (pathname?.startsWith("/admin/site-management/")) return "siteManagementPrincipalGroups";
  if (pathname?.startsWith("/admin/account")) {
    if (pathname.endsWith("/notification-settings")) return "accountNotifications";
    if (pathname.endsWith("/documents")) {
      return "accountDocuments";
    }

    if (pathname.endsWith("/category-change")) {
      return "accountCategoryChange";
    }

    if (pathname.endsWith("/affiliations")) {
      return "accountAffiliations";
    }

    if (pathname.endsWith("/delegations")) {
      return "accountDelegations";
    }

    if (pathname?.includes("/category-change-requests/")) {
      return "accountCategoryChangeRequestDetail";
    }

    if (pathname.endsWith("/category-change-requests")) {
      return "accountCategoryChangeRequests";
    }

    if (pathname.endsWith("/invitations")) {
      return "accountInvitations";
    }

    if (pathname.endsWith("/principal-groups")) {
      return "accountPrincipalGroups";
    }

    return "accountProfile";
  }

  if (pathname?.startsWith("/admin/user")) {
    if (pathname.endsWith("/language")) {
      return "userLanguage";
    }

    if (pathname.endsWith("/other")) {
      return "userOther";
    }

    return pathname.endsWith("/security") ? "userSecurity" : "userProfile";
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

  if (pathname?.endsWith("/official-certification")) {
    return "wikiOfficialCertificationRequest";
  }

  if (pathname?.endsWith("/official-certification/review")) {
    return "wikiOfficialCertificationReview";
  }

  if (pathname?.endsWith("/principal-groups")) {
    return "wikiPrincipalGroups";
  }

  return "wikiEditing";
};

function AdminResolvedPage({
  page,
  returnTo,
}: {
  page: AdminClientPage;
  returnTo: string | null;
}) {
  if (page === "siteManagementAnnouncements") return <SiteManagementPageClient activeTab="announcements"><SiteManagementAnnouncementsClient /></SiteManagementPageClient>;
  if (page === "siteManagementContacts") {
    return (
      <SiteManagementPageClient>
        <SiteManagementContactsClient />
      </SiteManagementPageClient>
    );
  }


  if (page === "siteManagementPrincipalGroups") {
    return (
      <SiteManagementPageClient>
        <SiteManagementPrincipalGroupsClient />
      </SiteManagementPageClient>
    );
  }

  if (page === "accountDelegations") {
    return (
      <AccountPageClient activeTab="accountDelegations">
        <AccountDelegationsClient />
      </AccountPageClient>
    );
  }

  if (page === "accountAffiliations") {
    return (
      <AccountPageClient activeTab="accountAffiliations">
        <AccountAffiliationsClient />
      </AccountPageClient>
    );
  }

  if (page === "accountCategoryChange") {
    return (
      <AccountPageClient activeTab="accountCategoryChange">
        <AccountCategoryChangeClient />
      </AccountPageClient>
    );
  }

  if (page === "accountCategoryChangeRequests") {
    return (
      <AccountPageClient activeTab="unapprovedAccountCategoryChangeRequests">
        <AccountCategoryChangeRequestsClient />
      </AccountPageClient>
    );
  }

  if (page === "accountCategoryChangeRequestDetail") {
    return (
      <AccountPageClient activeTab="unapprovedAccountCategoryChangeRequests">
        <AccountCategoryChangeRequestDetailClient />
      </AccountPageClient>
    );
  }

  if (page === "accountNotifications") return <AccountPageClient activeTab="accountNotifications"><AccountNotificationsClient /></AccountPageClient>;

  if (page === "accountDocuments") {
    return (
      <AccountPageClient activeTab="accountDocuments">
        <AccountDocumentsClient />
      </AccountPageClient>
    );
  }

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

  if (page === "userSecurity") {
    return (
      <UserPageClient activeSettingsTab="securitySettings">
        <UserSecurityClient />
      </UserPageClient>
    );
  }

  if (page === "userOther") {
    return (
      <UserPageClient activeSettingsTab="otherSettings">
        <UserOtherClient />
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
      ) : page === "wikiOfficialCertificationRequest" ? (
        <OfficialCertificationRequestClient />
      ) : page === "wikiOfficialCertificationReview" ? (
        <OfficialCertificationReviewClient />
      ) : page === "wikiPrincipalGroups" ? (
        <WikiPrincipalGroupsClient />
      ) : (
        <EditingWikisClient />
      )}
    </WikiSectionClient>
  );
}
