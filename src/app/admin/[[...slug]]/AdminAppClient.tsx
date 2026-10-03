"use client";

import { usePathname } from "next/navigation";

import { useI18n } from "@/i18n/I18nProvider";

import {
  isAccountSetupRequired,
  isAccountStatusUnavailable,
  isAccountSuspended,
} from "@/gateways/identity/identityApi";

import { AccountAffiliationsClient } from "../account/affiliations/AccountAffiliationsClient";
import { AccountCategoryChangeClient } from "../account/category-change/AccountCategoryChangeClient";
import { AccountCategoryChangeRequestDetailClient } from "../account/category-change-requests/[requestId]/AccountCategoryChangeRequestDetailClient";
import { AccountCategoryChangeRequestsClient } from "../account/category-change-requests/AccountCategoryChangeRequestsClient";
import { AccountDocumentsClient } from "../account/documents/AccountDocumentsClient";
import { AccountDelegationsClient } from "../account/delegations/AccountDelegationsClient";
import { AccountInvitationsClient } from "../account/invitations/AccountInvitationsClient";
import { AccountPrincipalGroupsClient } from "../account/principal-groups/AccountPrincipalGroupsClient";
import { AccountProfileClient } from "../account/profile/AccountProfileClient";
import { AccountPageClient } from "../account/AccountPageClient";
import { AccountInitialSetupClient } from "../AccountInitialSetupClient";
import { AdminShellClient } from "../AdminShellClient";
import { AdminProvider, useAdmin } from "../AdminProvider";
import type { AdminRouteContext } from "../adminTypes";
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
  context: AdminRouteContext;
  returnTo?: string | null;
};

export function AdminAppClient({
  context,
  returnTo = null,
}: AdminAppClientProps) {
  const pathname = usePathname();
  const { dictionary } = useI18n();
  const page = resolveAdminClientPage(pathname);

  if (isAccountStatusUnavailable(context.initialIdentity)) {
    return (
      <main className="min-h-[calc(100vh-73px)] bg-surface-base px-6 py-8 text-text-strong sm:px-10">
        <section role="alert" className="mx-auto max-w-2xl space-y-3 rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
          <h1 className="text-2xl font-bold">{dictionary.admin.accountStatusErrorTitle}</h1>
          <p className="text-sm leading-7 text-text-muted">{dictionary.admin.accountStatusErrorMessage}</p>
        </section>
      </main>
    );
  }

  if (isAccountSetupRequired(context.initialIdentity)) {
    return (
      <main className="min-h-[calc(100vh-73px)] bg-surface-base px-6 py-8 text-text-strong sm:px-10">
        <AccountInitialSetupClient returnTo={returnTo} />
      </main>
    );
  }

  return (
    <AdminProvider initialContext={context}>
      <AdminShellClient>
        {isAccountSuspended(context.initialIdentity) ? (
          <SuspendedAccountMessage />
        ) : (
          <AdminResolvedPage page={page} returnTo={returnTo} />
        )}
      </AdminShellClient>
    </AdminProvider>
  );
}

function SuspendedAccountMessage() {
  const { t } = useAdmin();

  return (
    <section className="rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
      <h2 className="text-xl font-bold">{t.suspendedAccountTitle}</h2>
      <p className="mt-3 text-sm leading-7 text-text-muted">{t.suspendedAccountMessage}</p>
    </section>
  );
}

type AdminClientPage = "accountAffiliations"
  | "accountDelegations"
  | "accountCategoryChange"
  | "accountCategoryChangeRequestDetail"
  | "accountCategoryChangeRequests"
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
  if (pathname?.startsWith("/admin/account")) {
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
