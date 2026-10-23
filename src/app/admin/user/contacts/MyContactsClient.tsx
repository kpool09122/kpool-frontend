"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { ContactCard, ContactDetail, ContactDialog } from "@/components/Contact";
import { UserSettingsPanel, UserStatusMessage } from "@/components/User";
import { fetchMyContactDetail, fetchMyContacts } from "@/gateways/contact/contactBrowserApi";
import { canViewOwnSiteManagementContacts } from "@/gateways/site-management/siteManagementPolicy";
import { useI18n } from "../../../../i18n/I18nProvider";
import { useAdmin } from "../../AdminProvider";

type StatusFilter = "all" | "replied" | "awaitingReply";

export function MyContactsClient() {
  const { currentIdentity } = useAdmin();
  if (!canViewOwnSiteManagementContacts(currentIdentity)) return null;
  const scope = JSON.stringify([currentIdentity.identityIdentifier, currentIdentity.accountIdentifier, currentIdentity.siteManagementPrincipalIdentifier]);
  return <MyContactsContent key={scope} />;
}

function MyContactsContent() {
  const { dictionary, locale } = useI18n();
  const { currentIdentity } = useAdmin();
  const t = dictionary.admin.myContacts;
  const common = dictionary.admin.siteManagementContacts;
  const filterRef = useRef<HTMLSelectElement>(null);
  const { identityIdentifier, accountIdentifier, siteManagementPrincipalIdentifier } = currentIdentity;
  const queryScope = ["myContacts", identityIdentifier, accountIdentifier, siteManagementPrincipalIdentifier];
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useQuery({
    queryKey: queryScope,
    queryFn: () => fetchMyContacts({ fallbackErrorMessage: t.loadFailed }),
  });
  const detail = useQuery({
    enabled: selectedId !== null && !list.isError,
    queryKey: [...queryScope, selectedId],
    queryFn: () => fetchMyContactDetail({
      contactIdentifier: selectedId!,
      fallbackErrorMessage: t.detailLoadFailed,
    }),
  });
  const contacts = (list.isError ? [] : list.data ?? []).filter((contact) =>
    status === "all" || (status === "replied"
      ? contact.replyIdentifiers.length > 0
      : contact.replyIdentifiers.length === 0));
  // Losing list access or membership must not resurrect a cached selection later.
  if (selectedId && (list.isError || (list.data && !contacts.some((contact) => contact.contactIdentifier === selectedId)))) {
    setSelectedId(null);
  }

  return (
    <UserSettingsPanel description={t.description} title={t.title}>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-semibold">
          {t.filter}
          <select
            ref={filterRef}
            className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
            value={status}
            onChange={(event) => { setStatus(event.currentTarget.value as StatusFilter); setSelectedId(null); }}
          >
            <option value="all">{t.all}</option>
            <option value="awaitingReply">{t.awaitingReply}</option>
            <option value="replied">{t.replied}</option>
          </select>
        </label>
        {list.isLoading ? <UserStatusMessage variant="warning">{t.loading}</UserStatusMessage> : null}
        {list.error ? <UserStatusMessage variant="error">{list.error.message}</UserStatusMessage> : null}
        {!list.isLoading && !list.error && contacts.length === 0 ? (
          <UserStatusMessage variant="warning">{t.empty}</UserStatusMessage>
        ) : null}
        {contacts.map((contact) => <ContactCard
          key={contact.contactIdentifier}
          contact={contact}
          categoryLabel={t.category(contact.category)}
          replyCountLabel={t.replyCount}
          locale={locale}
          onOpen={setSelectedId}
        />)}
        {!list.isError && selectedId ? <ContactDialog
          title={t.title}
          savedName={!detail.isLoading && !detail.isError && detail.data ? common.savedName(detail.data.name) : undefined}
          closeLabel={t.close}
          viewKey={selectedId}
          fallbackFocusRef={filterRef}
          onClose={() => setSelectedId(null)}
        >
          {detail.isLoading ? <UserStatusMessage variant="warning">{t.detailLoading}</UserStatusMessage> : null}
          {detail.error ? <UserStatusMessage variant="error">{detail.error.message}</UserStatusMessage> : null}
          {!detail.isError && detail.data ? <ContactDetail contact={detail.data} categoryLabel={t.category(detail.data.category)} locale={locale} historyTitle={common.previousReplies} emptyHistory={t.noReplies} /> : null}
        </ContactDialog> : null}
      </div>
    </UserSettingsPanel>
  );
}
