"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { approveAccountCategoryChangeRequest, fetchAccountCategoryChangeRequestDetail, rejectAccountCategoryChangeRequest } from "@/gateways/account/accountBrowserApi";
import type { RejectAccountCategoryChangeRequest } from "@/gateways/account/accountApi";
import { adminQueryKeys } from "../../../queryKeys";
import type { useI18n } from "../../../../../i18n/I18nProvider";

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];
export const rejectionReasonCodes: RejectAccountCategoryChangeRequest["rejectionReasonCode"][] = ["document_unclear", "document_expired", "document_mismatch", "document_incomplete", "fraudulent_document", "other"];

export const useAccountCategoryChangeRequestDetail = ({ canManage, t }: { canManage: boolean; t: AdminDictionary }) => {
  const pathname = usePathname();
  const requestId = useMemo(() => pathname?.split("/").filter(Boolean).pop() ?? "", [pathname]);
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReasonCode, setRejectionReasonCode] = useState<RejectAccountCategoryChangeRequest["rejectionReasonCode"]>("document_unclear");
  const [rejectionReasonDetail, setRejectionReasonDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryKey = [...adminQueryKeys.account.all(), "categoryChangeRequest", requestId] as const;
  const query = useQuery({ enabled: canManage && Boolean(requestId), queryFn: () => fetchAccountCategoryChangeRequestDetail({ fallbackErrorMessage: t.accountCategoryChangeRequestDetail.loadFailed, requestId }), queryKey });
  const approveMutation = useMutation({ mutationFn: () => approveAccountCategoryChangeRequest({ fallbackErrorMessage: t.accountCategoryChangeRequestDetail.approveFailed, requestId }), onError: (e) => setError(e instanceof Error ? e.message : t.accountCategoryChangeRequestDetail.approveFailed), onSuccess: async () => { setError(null); await queryClient.invalidateQueries({ queryKey }); } });
  const rejectMutation = useMutation({ mutationFn: () => rejectAccountCategoryChangeRequest({ fallbackErrorMessage: t.accountCategoryChangeRequestDetail.rejectFailed, requestBody: { rejectionReasonCode, rejectionReasonDetail: rejectionReasonDetail.trim() || undefined }, requestId }), onError: (e) => setError(e instanceof Error ? e.message : t.accountCategoryChangeRequestDetail.rejectFailed), onSuccess: async () => { setError(null); setRejectDialogOpen(false); await queryClient.invalidateQueries({ queryKey }); } });
  const detailRequired = rejectionReasonCode === "other";
  const canSubmitReject = !detailRequired || rejectionReasonDetail.trim().length > 0;
  const queryError = query.error instanceof Error ? query.error.message : null;
  return { approve: () => approveMutation.mutate(), canSubmitReject, data: query.data ?? null, detailRequired, error: error ?? queryError, isLoading: query.isLoading, isReviewing: approveMutation.isPending || rejectMutation.isPending, reject: () => { if (canSubmitReject) rejectMutation.mutate(); }, rejectDialogOpen, rejectionReasonCode, rejectionReasonDetail, requestId, setRejectDialogOpen, setRejectionReasonCode, setRejectionReasonDetail };
};
