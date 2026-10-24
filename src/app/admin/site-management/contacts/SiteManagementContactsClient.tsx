"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";

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
  const [selected, setSelected] = useState<SelectedContact | null>(null);
  const [content, setContent] = useState("");
  const canReply = canReplyToSiteManagementContacts(currentIdentity);
  const list = useQuery({
    queryKey: ["admin", "siteManagement", "contacts", currentIdentity.identityIdentifier, page],
    queryFn: () => fetchSiteManagementContacts({ page }),
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
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "siteManagement", "contact", currentIdentity.identityIdentifier, variables.contactIdentifier] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "siteManagement", "contacts", currentIdentity.identityIdentifier] });
    },
  });

  const lastPage = list.data && !list.isError ? Math.max(1, list.data.last_page) : page;
  if (page > lastPage) setPage(lastPage);

  const openContact = (contactIdentifier: string) => {
    if (reply.isPending) return;
    reply.reset();
    setContent("");
    setSelected({ contactIdentifier });
  };
  const closeContact = () => {
    if (reply.isPending) return;
    reply.reset();
    setContent("");
    setSelected(null);
  };

  return (
    <section className="grid gap-5">
      <header className="space-y-2">
        <h2 className="text-xl font-bold">{text.title}</h2>
        <p className="text-sm text-text-muted">{text.description}</p>
      </header>
      {list.isLoading ? <AccountStatusMessage variant="loading">{text.loading}</AccountStatusMessage> : null}
      {list.isError ? <AccountStatusMessage variant="error">{text.loadFailed}</AccountStatusMessage> : null}
      {!list.isLoading && !list.isError && list.data?.contacts.length === 0 ? <AccountStatusMessage variant="empty">{text.empty}</AccountStatusMessage> : null}
      <div className="grid gap-3">
        {!list.isError && list.data?.contacts.map((contact) => (
          <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stroke-subtle bg-surface-raised p-4" key={contact.contactIdentifier}>
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-text-strong">{contact.name}</p>
              <p className="text-sm text-text-muted">{text.category(contact.category)} · {formatDate(contact.createdAt, locale)}</p>
            </div>
            <button
              className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-strong disabled:cursor-not-allowed disabled:opacity-60"
              disabled={reply.isPending}
              onClick={() => openContact(contact.contactIdentifier)}
              type="button"
            >
              {text.open}
            </button>
          </article>
        ))}
      </div>
      {!list.isError && list.data && list.data.last_page > 1 ? <div className="flex items-center justify-between gap-3 text-sm">
        <button className="rounded-lg border border-stroke-subtle px-3 py-2 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">{text.previousPage}</button>
        <span>{text.page(list.data.current_page, list.data.last_page)}</span>
        <button className="rounded-lg border border-stroke-subtle px-3 py-2 disabled:opacity-60" disabled={page >= list.data.last_page} onClick={() => setPage((current) => current + 1)} type="button">{text.nextPage}</button>
      </div> : null}
      {selected ? <ContactDialog title={text.title} onClose={closeContact}>
        <section className="grid w-full gap-5 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold">{text.title}</h3><button className="rounded-lg border border-stroke-subtle px-3 py-2 text-sm disabled:opacity-60" disabled={reply.isPending} onClick={closeContact} type="button">{text.close}</button></div>
          {detail.isLoading ? <AccountStatusMessage variant="loading">{text.detailLoading}</AccountStatusMessage> : null}
          {detail.isError ? <AccountStatusMessage variant="error">{text.detailLoadFailed}</AccountStatusMessage> : null}
          {!detail.isError && detail.data ? <>
            <section className="grid gap-3 rounded-lg bg-surface-base p-4"><p className="text-sm text-text-muted">{text.category(detail.data.category)} · {formatDate(detail.data.createdAt, locale)}</p><p className="whitespace-pre-wrap text-text-strong">{detail.data.content}</p></section>
            <section className="grid gap-2"><h4 className="font-semibold">{text.previousReplies}</h4>{detail.data.replies.length === 0 ? <p className="text-sm text-text-muted">{text.noPreviousReplies}</p> : detail.data.replies.map((item) => <article className="rounded-lg bg-surface-base p-3" key={item.replyIdentifier}><p className="whitespace-pre-wrap">{item.content}</p><p className="mt-2 text-sm text-text-muted">{formatDate(item.sentAt ?? item.createdAt ?? "", locale)}</p></article>)}</section>
            {canReply ? <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); if (!reply.isPending && content.trim()) reply.mutate({ contactIdentifier: selected.contactIdentifier, content }); }}>
              <label className="grid gap-2 text-sm font-semibold">{text.replyContent}<textarea className="min-h-28 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 font-normal" disabled={reply.isPending} onChange={(event) => setContent(event.currentTarget.value)} required value={content} /></label>
              {reply.isError ? <AccountStatusMessage variant="error">{text.replyFailed}</AccountStatusMessage> : null}
              <button className="justify-self-start rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={reply.isPending || !content.trim()} type="submit">{reply.isPending ? text.replying : text.reply}</button>
            </form> : null}
          </> : null}
        </section>
      </ContactDialog> : null}
    </section>
  );
}

function ContactDialog({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    return () => { dialog?.close?.(); opener?.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={title} aria-modal="true"
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-xl bg-surface-raised text-text-strong backdrop:bg-black/40"
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    {children}
  </dialog>;
}
