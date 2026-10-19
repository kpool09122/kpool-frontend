import { redirect } from "next/navigation";

import { normalizeReturnTo } from "@/gateways/auth/authFlow";
import { getAuthenticatedAccountStatus, isAccountSetupRequired } from "@/gateways/identity/identityApi";

import { AdminAppClient } from "./AdminAppClient";
import { loadAdminRouteContext } from "../adminRouteContext";
import { loadAdminWikiPrincipal } from "../adminWikiPrincipal";
import { loadAdminIdentity } from "../adminIdentity";
import { getAdminInitialRoute, resolveAdminDestination } from "../adminNavigation";

export const dynamic = "force-dynamic";

type AdminProps = {
  params?: Promise<{
    slug?: string[];
  }>;
  searchParams?: Promise<{
    authReturnTo?: string | string[];
    returnTo?: string | string[];
  }>;
};

const getSingleSearchParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const normalizeOptionalReturnTo = (value: string | undefined): string | null =>
  value ? normalizeReturnTo(value) : null;

const buildLoginReturnTo = (slug: string[] | undefined): string =>
  slug && slug.length > 0 ? `/admin/${slug.join("/")}` : "/admin";

export default async function Admin({ params, searchParams }: AdminProps = {}) {
  const resolvedParams = params ? await params : {};
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const returnTo = normalizeOptionalReturnTo(
    getSingleSearchParam(resolvedSearchParams.returnTo),
  );
  const authReturnTo = normalizeOptionalReturnTo(
    getSingleSearchParam(resolvedSearchParams.authReturnTo),
  );

  if (resolvedParams.slug?.join("/") === "user/contacts") {
    redirect("/admin/site-management/contacts");
  }

  if (authReturnTo || !resolvedParams.slug?.length) {
    const identity = await loadAdminIdentity();
    if (identity && authReturnTo && getAuthenticatedAccountStatus(identity) === "active") {
      redirect(resolveAdminDestination(identity, authReturnTo, await loadAdminWikiPrincipal()));
    }
    if (identity && !returnTo && !authReturnTo && !isAccountSetupRequired(identity)) {
      redirect(getAdminInitialRoute(identity, await loadAdminWikiPrincipal()));
    }
  }

  const data = await loadAdminRouteContext(
    buildLoginReturnTo(resolvedParams.slug),
    resolvedParams.slug,
  );

  return <AdminAppClient data={data} returnTo={authReturnTo ?? returnTo} />;
}
