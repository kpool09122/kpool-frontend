"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { fetchAccountCategoryChangeRequests } from "@/gateways/account/accountBrowserApi";
import { adminQueryKeys } from "../../queryKeys";
import type { useI18n } from "../../../../i18n/I18nProvider";

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];

export const useAccountCategoryChangeRequests = ({ canManage, t }: { canManage: boolean; t: AdminDictionary }) => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const query = useQuery({
    enabled: canManage,
    queryFn: () => fetchAccountCategoryChangeRequests({ fallbackErrorMessage: t.accountCategoryChangeRequests.loadFailed, page, status: "pending" }),
    queryKey: [...adminQueryKeys.account.all(), "categoryChangeRequests", page],
  });
  return { data: query.data ?? null, error: query.error?.message ?? null, isLoading: query.isLoading, openDetail: (requestId: string) => router.push(`/admin/account/category-change-requests/${requestId}`), page, reload: () => void query.refetch(), setPage };
};
