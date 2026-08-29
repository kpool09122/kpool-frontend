import { redirect } from "next/navigation";

import { AdminAppClient } from "./AdminAppClient";
import { loadAdminRouteContext } from "../adminRouteContext";

export const dynamic = "force-dynamic";

type AdminProps = {
  params?: Promise<{
    slug?: string[];
  }>;
  searchParams?: Promise<{
    returnTo?: string | string[];
  }>;
};

const getSingleSearchParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const normalizeOptionalReturnTo = (value: string | undefined): string | null =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null;

const buildLoginReturnTo = (slug: string[] | undefined): string =>
  slug && slug.length > 0 ? `/admin/${slug.join("/")}` : "/admin";

export default async function Admin({ params, searchParams }: AdminProps = {}) {
  const resolvedParams = params ? await params : {};
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const returnTo = normalizeOptionalReturnTo(
    getSingleSearchParam(resolvedSearchParams.returnTo),
  );

  if (resolvedParams.slug?.join("/") === "user/contacts") {
    redirect("/admin/site-management/contacts");
  }

  if (!returnTo && (!resolvedParams.slug || resolvedParams.slug.length === 0)) {
    redirect("/admin/wiki/editing");
  }

  const context = await loadAdminRouteContext(
    buildLoginReturnTo(resolvedParams.slug),
    resolvedParams.slug,
  );

  return <AdminAppClient context={context} returnTo={returnTo} />;
}
