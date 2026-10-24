"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { ContactCard, ContactDetail, ContactDialog } from "@/components/Contact";
import { UserSettingsPanel, UserStatusMessage } from "@/components/User";
import { fetchMyContactDetail, fetchMyContacts } from "@/gateways/contact/contactBrowserApi";
import { canViewOwnSiteManagementContacts } from "@/gateways/site-management/siteManagementPolicy";
import { canReplyToMyContact, normalizeMyContactReplyContent } from "@/gateways/contact/contactConversation";
import { useMyContactReply } from "./useMyContactReply";
import { useI18n } from "../../../../i18n/I18nProvider";
import { useAdmin } from "../../AdminProvider";

type StatusFilter = "all" | "replied" | "awaitingReply";

export function MyContactsClient() {
  const { currentIdentity } = useAdmin();
  if (!canViewOwnSiteManagementContacts(currentIdentity)) return null;
  const scope = JSON.stringify([currentIdentity.identityIdentifier, currentIdentity.accountIdentifier, currentIdentity.siteManagementPrincipalIdentifier, currentIdentity.delegationIdentifier]);
  return <MyContactsContent key={scope} />;
}

function MyContactsContent() {
  const { dictionary, locale } = useI18n();
  const { currentIdentity } = useAdmin();
  const t = dictionary.admin.myContacts;
  const replyText = dictionary.admin.myContactReply;
  const common = dictionary.admin.siteManagementContacts;
  const filterRef = useRef<HTMLSelectElement>(null);
  const { identityIdentifier, accountIdentifier, siteManagementPrincipalIdentifier } = currentIdentity;
  const queryScope = ["myContacts", identityIdentifier, accountIdentifier, siteManagementPrincipalIdentifier];
  const reply = useMyContactReply({ queryScope, locale, fallbackErrorMessage: common.replyFailed, detailLoadFailed: t.detailLoadFailed });
  const selectContact = (id: string | null) => { if (reply.select(id)) setSelectedId(id); };
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useQuery({
    queryKey: queryScope,
    queryFn: () => fetchMyContacts({ fallbackErrorMessage: t.loadFailed }),
  });
  const detail = useQuery({
    retry: false,
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
    if (!reply.busy) setSelectedId(null);
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
            disabled={reply.busy}
            onChange={(event) => { if (reply.busy) return; setStatus(event.currentTarget.value as StatusFilter); selectContact(null); }}
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
          disabled={reply.busy || reply.accessLost}
          onOpen={selectContact}
        />)}
        {!list.isError && selectedId ? <ContactDialog
          title={t.title}
          savedName={!reply.accessLost && !detail.isLoading && !detail.isError && detail.data ? common.savedName(detail.data.name) : undefined}
          closeLabel={t.close}
          viewKey={selectedId}
          fallbackFocusRef={filterRef}
          closeDisabled={reply.busy}
          onClose={() => selectContact(null)}
        >
          {detail.isLoading ? <UserStatusMessage variant="warning">{t.detailLoading}</UserStatusMessage> : null}
          {detail.error ? <UserStatusMessage variant="error">{detail.error.message}</UserStatusMessage> : null}
          {reply.errorMessage ? <UserStatusMessage variant="error">{reply.errorMessage}</UserStatusMessage> : null}
          {!reply.accessLost && !detail.isError && detail.data ? <ContactDetail contact={detail.data} categoryLabel={t.category(detail.data.category)} locale={locale} historyTitle={common.previousReplies} emptyHistory={t.noReplies} /> : null}
          {!reply.accessLost && !reply.blocked && !detail.isError && detail.data && canReplyToMyContact(detail.data.replies) ? <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); if (!reply.busy && !reply.needsConfirmation) void reply.submit(detail.data!); }}>
            <label className="grid gap-2 text-sm font-semibold">{common.replyContent}<textarea className="min-h-48 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 font-normal" disabled={reply.busy || reply.needsConfirmation} onChange={(event) => reply.setContent(event.currentTarget.value)} required value={reply.content} /></label>
            {!reply.needsConfirmation ? <button className="justify-self-start rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={reply.busy || !normalizeMyContactReplyContent(reply.content)} type="submit">{reply.busy ? common.replying : common.reply}</button> : null}
          </form> : null}
          {reply.phase === "notificationUnconfirmed" ? <UserStatusMessage variant="warning">{replyText.replyNotificationUnconfirmed}</UserStatusMessage> : null}
          {reply.phase === "saved" ? <UserStatusMessage variant="success">{replyText.replySaved}</UserStatusMessage> : null}

          {reply.needsConfirmation ? <>
            <UserStatusMessage variant="warning">{reply.phase === "refreshFailed" ? replyText.replyRefreshFailed : replyText.replyUnknown}</UserStatusMessage>
            <button className="justify-self-start rounded-lg border border-stroke-subtle px-3 py-2 text-sm disabled:opacity-60" disabled={reply.busy} onClick={() => void reply.recheck()} type="button">{replyText.confirmReply}</button>
          </> : null}
        </ContactDialog> : null}
      </div>
    </UserSettingsPanel>
  );
}
