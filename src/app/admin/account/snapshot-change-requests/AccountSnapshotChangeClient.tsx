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
  const { locale, dictionary } = useI18n();
  const t = accountSnapshotCopy[locale];
  const labels = dictionary.admin.accountCategoryChangeRequests;
  const [filter, setFilter] = useState({ status: "pending", page: 1 });
  const query = useQuery({ queryKey: [...adminQueryKeys.account.all(), "snapshotChangeList", accountIdentifier, accountPrincipalIdentifier, locale, filter], queryFn: () => fetchSnapshotChanges(locale, filter.status, filter.page), enabled: Boolean(accountIdentifier && canManageSnapshotChangeRequests), retry: false });
  return <AccountSettingsPanel title={t.review} description={t.reviewDescription}>
    <div className="mt-5 grid gap-4">
      <label className="grid w-fit gap-2 text-sm font-semibold">{t.status}
        <select className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2" value={filter.status} onChange={(event) => setFilter({ status: event.currentTarget.value, page: 1 })}>
          {(["pending", "approved", "rejected"] as const).map(status => <option value={status} key={status}>{t[`${status}Label`]}</option>)}
        </select>
      </label>
      {query.error ? <AccountStatusMessage variant="error">{t.error}</AccountStatusMessage> : null}
      {query.isLoading ? <AccountStatusMessage variant="loading">{dictionary.admin.accountSettingsLoading}</AccountStatusMessage> : null}
      {query.data?.requests.length === 0 ? <AccountStatusMessage variant="empty">{t.empty}</AccountStatusMessage> : null}
      <div className="grid gap-3">
        {query.data?.requests.map(request => <Link
          className="rounded-xl border border-stroke-subtle bg-surface-raised p-4 text-left transition hover:border-brand-primary"
          key={request.requestIdentifier}
          href={`/admin/account/snapshot-change-requests/${request.requestIdentifier}`}
        >
          <p className="whitespace-pre-wrap break-words font-semibold text-text-strong">{request.changeReason}</p>
          <p className="mt-2 text-sm text-text-muted">{t[`${request.status}Label`]}</p>
          <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <div><dt className="text-text-muted">{labels.requestedAt}</dt><dd><LocalizedDateTime value={request.requestedAt} /></dd></div>
          </dl>
        </Link>)}
      </div>
      {query.data ? <nav aria-label={labels.pagination} className="flex items-center gap-3">
        <button className="rounded-lg border border-stroke-subtle px-3 py-2 text-sm disabled:opacity-50" disabled={query.isFetching || filter.page <= 1} onClick={() => setFilter({ ...filter, page: filter.page - 1 })} type="button">{labels.previous}</button>
        <span className="text-sm text-text-muted">{filter.page}/{query.data.pagination.lastPage} ({query.data.pagination.total})</span>
        <button className="rounded-lg border border-stroke-subtle px-3 py-2 text-sm disabled:opacity-50" disabled={query.isFetching || filter.page >= query.data.pagination.lastPage} onClick={() => setFilter({ ...filter, page: filter.page + 1 })} type="button">{labels.next}</button>
      </nav> : null}
    </div>
  </AccountSettingsPanel>;
}
