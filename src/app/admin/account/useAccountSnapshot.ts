"use client";
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCurrentAccountSnapshot, fetchLatestSnapshotChange } from "@/gateways/account/accountSnapshotApi";
import { useI18n } from "@/i18n/I18nProvider";
import { useAccountSection } from "./AccountSectionContext";
import { adminQueryKeys } from "../queryKeys";
const latestForAccount = (id: string | null) => [...adminQueryKeys.account.all(), "snapshotChangeLatest", id] as const;
export const accountSnapshotKeys = {
  latestForAccount,
  current: (id: string | null, locale: string, actor?: string | null) => [...adminQueryKeys.account.all(), "snapshot", id, locale, actor] as const,
  latest: (id: string | null, locale: string, actor?: string | null) => [...latestForAccount(id), locale, actor] as const,
};
export const useAccountSnapshot = (accountIdentifier: string | null) => {
  const { locale } = useI18n();
  const actor = useAccountSection()?.accountPrincipalIdentifier;
  const client = useQueryClient();
  const current = useQuery({ queryKey: accountSnapshotKeys.current(accountIdentifier, locale, actor), enabled: Boolean(accountIdentifier), queryFn: () => fetchCurrentAccountSnapshot(accountIdentifier ?? "", locale), retry: false });
  const latest = useQuery({ queryKey: accountSnapshotKeys.latest(accountIdentifier, locale, actor), enabled: Boolean(accountIdentifier), queryFn: () => fetchLatestSnapshotChange(accountIdentifier ?? "", locale), retry: false, refetchInterval: 30000 });
  const previous = useRef<{ id: string | null; status: string | undefined }>({ id: accountIdentifier, status: undefined });
  const status = latest.data?.request?.status;
  useEffect(() => {
    if (previous.current.id === accountIdentifier && previous.current.status === "pending" && status && status !== "pending") {
      void client.invalidateQueries({ queryKey: accountSnapshotKeys.current(accountIdentifier, locale, actor) });
      void client.invalidateQueries({ queryKey: adminQueryKeys.account.profile(accountIdentifier) });
      void client.invalidateQueries({ queryKey: adminQueryKeys.account.documents(accountIdentifier) });
    }
    previous.current = { id: accountIdentifier, status };
  }, [accountIdentifier, actor, status, client, locale]);
  const refresh = async () => { await Promise.all([current.refetch(), latest.refetch()]); };
  const refreshLatest = async () => { await client.invalidateQueries({ queryKey: accountSnapshotKeys.latest(accountIdentifier, locale, actor) }); };
  const refreshRelated = async () => { await client.invalidateQueries({ queryKey: adminQueryKeys.account.all() }); };
  const editingLocked = !accountIdentifier || !latest.isSuccess || latest.data.request?.status === "pending";
  return { current, latest, refresh, refreshLatest, refreshRelated, pending: latest.data?.request?.status === "pending", editingLocked, snapshotLocked: editingLocked || latest.data?.categoryChangePending === true };
};
