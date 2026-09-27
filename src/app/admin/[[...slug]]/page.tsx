import { redirect } from "next/navigation";

import { normalizeReturnTo } from "@/gateways/auth/authFlow";
import { getAuthenticatedAccountStatus } from "@/gateways/identity/identityApi";

import { AdminAppClient } from "./AdminAppClient";
import { loadAdminRouteContext } from "../adminRouteContext";

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

  if (!returnTo && !authReturnTo && (!resolvedParams.slug || resolvedParams.slug.length === 0)) {
    redirect("/admin/wiki/editing");
  }

  const context = await loadAdminRouteContext(
    buildLoginReturnTo(resolvedParams.slug),
    resolvedParams.slug,
  );

  if (authReturnTo && getAuthenticatedAccountStatus(context.initialIdentity) === "active") {
    redirect(authReturnTo);
  }

  return <AdminAppClient context={context} returnTo={authReturnTo ?? returnTo} />;
}
