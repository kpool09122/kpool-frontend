"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import { fetchSnapshotChanges } from "@/gateways/account/accountSnapshotApi";
import { useI18n } from "@/i18n/I18nProvider";
import { accountSnapshotCopy } from "@/i18n/accountSnapshot";
import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import { useAccountSection } from "../AccountSectionContext";
import { adminQueryKeys } from "../../queryKeys";
import { SnapshotChangeReview } from "./SnapshotChangeReview";
import { snapshotButtonClass } from "../AccountSnapshotPanel";
export function AccountSnapshotChangeClient({ management = false }: { management?: boolean }) {
  const { accountIdentifier, accountPrincipalIdentifier, canManageSnapshotChangeRequests } = useAccountSection();
  const path = usePathname() ?? "";
  const requestId = path.split("/")[4];
  if (management && !canManageSnapshotChangeRequests) return <Denied />;
  return requestId ? <SnapshotChangeReview actor={accountPrincipalIdentifier} accountIdentifier={accountIdentifier} canManage={management && Boolean(canManageSnapshotChangeRequests)} requestId={requestId} /> : <SnapshotChangeList key={accountIdentifier} />;
}
function Denied() {
  const { locale } = useI18n();
  return <AccountStatusMessage variant="warning">{accountSnapshotCopy[locale].readOnly}</AccountStatusMessage>;
}
function SnapshotChangeList() {
  const { accountIdentifier, accountPrincipalIdentifier, canManageSnapshotChangeRequests } = useAccountSection();
  const { locale } = useI18n();
  const t = accountSnapshotCopy[locale];
  const [filter, setFilter] = useState({ status: "pending", page: 1 });
  const query = useQuery({ queryKey: [...adminQueryKeys.account.all(), "snapshotChangeList", accountIdentifier, accountPrincipalIdentifier, locale, filter], queryFn: () => fetchSnapshotChanges(locale, filter.status, filter.page), enabled: Boolean(accountIdentifier && canManageSnapshotChangeRequests), retry: false });
  return <AccountSettingsPanel title={t.review}><div className="mt-4 grid gap-4">
    <label>{t.status}<select className="ml-2 rounded border bg-surface-base p-2" value={filter.status} onChange={(e) => setFilter({ status: e.currentTarget.value, page: 1 })}>{(["pending", "approved", "rejected"] as const).map((status) => <option value={status} key={status}>{t[`${status}Label`]}</option>)}</select></label>
    {query.error ? <AccountStatusMessage variant="error">{t.error}</AccountStatusMessage> : null}
    {query.isLoading ? <p>…</p> : null}
    {query.data?.requests.length === 0 ? <p>{t.empty}</p> : null}
    <ul className="grid gap-3">{query.data?.requests.map((request) => <li className="grid gap-2 rounded border border-stroke-subtle p-3" key={request.requestIdentifier}><p className="break-all">{request.accountIdentifier}</p><p className="break-words">{request.changeReason}</p><LocalizedDateTime value={request.requestedAt} /><Link className="underline" href={`/admin/account/snapshot-change-requests/${request.requestIdentifier}`}>{t.open}</Link></li>)}</ul>
    <div className="flex gap-3"><button className={snapshotButtonClass} disabled={query.isFetching || filter.page <= 1} onClick={() => setFilter({ ...filter, page: filter.page - 1 })} type="button">{t.previous}</button><span>{filter.page} / {query.data?.pagination.lastPage ?? "-"}</span><button className={snapshotButtonClass} disabled={query.isFetching || !query.data || filter.page >= query.data.pagination.lastPage} onClick={() => setFilter({ ...filter, page: filter.page + 1 })} type="button">{t.next}</button><button className={snapshotButtonClass} disabled={query.isFetching} onClick={() => void query.refetch()} type="button">{t.retry}</button></div>
  </div></AccountSettingsPanel>;
}
