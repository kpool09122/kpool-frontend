"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PaperPlaneIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useState } from "react";

import { ContactConversation } from "@/components/Contact/ContactConversation";
import { ContactCard } from "@/components/Contact/ContactCard";
import { AccountStatusMessage } from "@/components/Account";
import { canReplyToSiteManagementContacts, canViewSiteManagementContacts } from "@/gateways/site-management/siteManagementPolicy";
import {
  fetchSiteManagementContactDetail,
  fetchSiteManagementContacts,
  replyToSiteManagementContact,
} from "@/gateways/site-management/siteManagementContacts";
import { useAdmin } from "../../AdminProvider";

const formatDate = (value: string, locale: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

type SelectedContact = { contactIdentifier: string };

export function SiteManagementContactsClient() {
  const { currentIdentity } = useAdmin();
  if (!canViewSiteManagementContacts(currentIdentity)) return null;
  return <SiteManagementContactsContent />;
}

function SiteManagementContactsContent() {
  const { currentIdentity, locale, t } = useAdmin();
  const text = t.siteManagementContacts;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [unansweredOnly, setUnansweredOnly] = useState(true);
  const [selected, setSelected] = useState<SelectedContact | null>(null);
  const [content, setContent] = useState("");
  const canReply = canReplyToSiteManagementContacts(currentIdentity);
  const list = useQuery({
    queryKey: ["admin", "siteManagement", "contacts", currentIdentity.identityIdentifier, page, unansweredOnly],
    queryFn: () => fetchSiteManagementContacts({ page, unansweredOnly }),
  });
  const detail = useQuery({
    queryKey: ["admin", "siteManagement", "contact", currentIdentity.identityIdentifier, selected?.contactIdentifier],
    queryFn: () => fetchSiteManagementContactDetail({
      contactIdentifier: selected!.contactIdentifier,
    }),
    enabled: selected !== null,
  });
  const reply = useMutation({
    mutationFn: replyToSiteManagementContact,
    onSuccess: async (_result, variables) => {
      setContent("");
      if (unansweredOnly) setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "siteManagement", "contact", currentIdentity.identityIdentifier, variables.contactIdentifier] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "siteManagement", "contacts", currentIdentity.identityIdentifier] });
    },
  });

  const lastPage = list.data && !list.isError ? Math.max(1, list.data.last_page) : page;
  if (page > lastPage) setPage(lastPage);

  const toggleContact = (contactIdentifier: string) => {
    if (reply.isPending) return;
    reply.reset();
    setContent("");
    setSelected(selected?.contactIdentifier === contactIdentifier ? null : { contactIdentifier });
  };

  const resetSelection = () => {
    reply.reset();
    setContent("");
    setSelected(null);
  };

  return (
    <section className="grid gap-5">
      <header className="space-y-2">
        <h2 className="text-xl font-bold">{text.title}</h2>
      </header>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={unansweredOnly}
          disabled={reply.isPending}
          onChange={(event) => {
            resetSelection();
            setUnansweredOnly(event.currentTarget.checked);
            setPage(1);
          }}
        />
        {text.unansweredOnly}
      </label>
      {list.isLoading ? <AccountStatusMessage variant="loading">{text.loading}</AccountStatusMessage> : null}
      {list.isError ? <AccountStatusMessage variant="error">{text.loadFailed}</AccountStatusMessage> : null}
      {!list.isLoading && !list.isError && list.data?.contacts.length === 0 ? <AccountStatusMessage variant="empty">{text.empty}</AccountStatusMessage> : null}
      <div className="grid gap-3">
        {!list.isError && list.data?.contacts.map((contact) => (
          <ContactCard
            key={contact.contactIdentifier}
            name={contact.name}
            date={formatDate(contact.createdAt, locale)}
            category={text.category(contact.category)}
            content={contact.content}
            replied={contact.replyIdentifiers.length > 0}
            statusLabel={contact.replyIdentifiers.length ? text.replied : text.awaitingReply}
            expanded={selected?.contactIdentifier === contact.contactIdentifier}
            disabled={reply.isPending}
            onToggle={() => toggleContact(contact.contactIdentifier)}
          >
            <div className="grid gap-4">
              {detail.isLoading ? <AccountStatusMessage variant="loading">{text.detailLoading}</AccountStatusMessage> : null}
              {detail.isError ? <AccountStatusMessage variant="error">{text.detailLoadFailed}</AccountStatusMessage> : null}
              {!detail.isError && detail.data ? <>
                <ContactConversation
                  label={t.contactConversation.label}
                  perspective="operator"
                  submitterName={detail.data.name}
                  operatorLabel={t.contactConversation.operator}
                  initialMessage={{ content: detail.data.content, date: formatDate(detail.data.createdAt, locale) }}
                  replies={detail.data.replies.map((item) => ({
                    id: item.replyIdentifier,
                    content: item.content,
                    date: formatDate(item.sentAt ?? item.createdAt ?? "", locale),
                    fromSubmitter: item.replyType === "submitter",
                  }))}
                />
                {canReply ? <form className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-stroke-subtle pt-4" onSubmit={(event) => {
                  event.preventDefault();
                  if (!reply.isPending && content.trim()) reply.mutate({ contactIdentifier: contact.contactIdentifier, content });
                }}>
                  <label className="grid min-w-0 gap-2">
                    <span className="sr-only">{text.replyContent}</span>
                    <textarea
                      className="min-h-24 w-full resize-y rounded-2xl border border-stroke-subtle bg-surface-raised px-4 py-3 text-sm leading-6 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:opacity-60"
                      placeholder={text.replyContent}
                      disabled={reply.isPending}
                      onChange={(event) => setContent(event.currentTarget.value)}
                      required
                      value={content}
                    />
                  </label>
                  <button
                    aria-label={reply.isPending ? text.replying : text.reply}
                    aria-busy={reply.isPending}
                    title={reply.isPending ? text.replying : text.reply}
                    className="grid size-11 place-items-center justify-self-end rounded-full bg-brand-primary text-on-primary transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:opacity-60"
                    disabled={reply.isPending || !content.trim()}
                    type="submit"
                  >
                    {reply.isPending ? <ReloadIcon aria-hidden="true" className="size-5 animate-spin" /> : <PaperPlaneIcon aria-hidden="true" className="size-5" />}
                  </button>
                  {reply.isError ? <div className="col-span-2"><AccountStatusMessage variant="error">{text.replyFailed}</AccountStatusMessage></div> : null}
                </form> : null}
              </> : null}
            </div>
          </ContactCard>
        ))}
      </div>
      {!list.isError && list.data && list.data.last_page > 1 ? <div className="flex items-center justify-between gap-3 text-sm">
        <button className="rounded-lg border border-stroke-subtle px-3 py-2 disabled:opacity-60" disabled={reply.isPending || page <= 1} onClick={() => { resetSelection(); setPage((current) => current - 1); }} type="button">{text.previousPage}</button>
        <span>{text.page(list.data.current_page, list.data.last_page)}</span>
        <button className="rounded-lg border border-stroke-subtle px-3 py-2 disabled:opacity-60" disabled={reply.isPending || page >= list.data.last_page} onClick={() => { resetSelection(); setPage((current) => current + 1); }} type="button">{text.nextPage}</button>
      </div> : null}
    </section>
  );
}
