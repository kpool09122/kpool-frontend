import { redirect } from "next/navigation";
import { getAnalyzeRequestCountry } from "@/gateways/analyze/analyzeRequestCountry";

import { normalizeReturnTo } from "@/gateways/auth/authFlow";
import { getAuthenticatedAccountStatus, isAccountSetupRequired } from "@/gateways/identity/identityApi";

import { AdminAppClient } from "./AdminAppClient";
import { loadAdminRouteContext } from "../adminRouteContext";
import { loadAdminWikiPrincipal } from "../adminWikiPrincipal";
import { loadAdminIdentity } from "../adminIdentity";
import { getAdminInitialRoute, resolveAdminDestination } from "../adminNavigation";
import { analyzeConditionKeys, analyzeLocationKeys } from "../analyze/analyzeConditions";

export const dynamic = "force-dynamic";

type AdminProps = {
  params?: Promise<{
    slug?: string[];
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getSingleSearchParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const normalizeOptionalReturnTo = (value: string | undefined): string | null =>
  value ? normalizeReturnTo(value) : null;

const buildLoginReturnTo = (slug: string[] | undefined, searchParams: Record<string, string | string[] | undefined>): string => {
  const path = slug?.length ? `/admin/${slug.join("/")}` : "/admin";
  if (slug?.join("/") !== "analyze") return path;
  const query = new URLSearchParams();
  for (const key of [...analyzeConditionKeys, ...analyzeLocationKeys, "test"]) {
    const value = getSingleSearchParam(searchParams[key]);
    if (value) query.set(key, value);
  }
  return query.size ? `${path}?${query}` : path;
};

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
    buildLoginReturnTo(resolvedParams.slug, resolvedSearchParams),
    resolvedParams.slug,
  );

  return <AdminAppClient data={data} returnTo={authReturnTo ?? returnTo} initialCountry={getAnalyzeRequestCountry()} />;
}
