"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AccountStatusMessage } from "@/components/Account";
import { ContactCard, ContactDetail, ContactDialog } from "@/components/Contact";
import { canReplyToSiteManagementContacts, canViewOwnSiteManagementContacts, canViewSiteManagementContacts } from "@/gateways/site-management/siteManagementPolicy";
import {
  fetchSiteManagementContactDetail,
  fetchSiteManagementContacts,
  replyToSiteManagementContact,
} from "@/gateways/site-management/siteManagementContacts";
import { useAdmin } from "../../AdminProvider";
import { MyContactsClient } from "../../user/contacts/MyContactsClient";

type SelectedContact = { contactIdentifier: string };
type ContactList = "all" | "unanswered";

export function SiteManagementContactsClient() {
  const { currentIdentity } = useAdmin();
  const pathname = usePathname();
  if (pathname === "/admin/site-management/contacts/unanswered") return null;
  if (pathname !== "/admin/site-management/contacts/manage") {
    return <MyContactsClient />;
  }
  if (!canViewSiteManagementContacts(currentIdentity)) {
    return canViewOwnSiteManagementContacts(currentIdentity) ? <MyContactsClient /> : null;
  }
  return <SiteManagementContactsContent
    key={JSON.stringify([currentIdentity.identityIdentifier, currentIdentity.accountIdentifier, currentIdentity.siteManagementPrincipalIdentifier, currentIdentity.delegationIdentifier])}
  />;
}

function SiteManagementContactsContent() {
  const { currentIdentity, locale, t } = useAdmin();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasReply = searchParams.getAll("hasReply");
  const listType: ContactList = hasReply.length === 1 && hasReply[0] === "0" ? "unanswered" : "all";
  const text = t.siteManagementContacts;
  const actorScope = [currentIdentity.identityIdentifier, currentIdentity.accountIdentifier, currentIdentity.siteManagementPrincipalIdentifier, currentIdentity.delegationIdentifier ?? null];
  const unanswered = listType === "unanswered";
  const title = text.title;
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [storedPage, setPage] = useState(1);
  const [previousList, setPreviousList] = useState(listType);
  const page = previousList === listType ? storedPage : 1;
  const [selected, setSelected] = useState<SelectedContact | null>(null);
  const [sender, setSender] = useState<{ principalIdentifier: string; page: number } | null>(null);
  const [content, setContent] = useState("");
  const [accessLost, setAccessLost] = useState(false);
  const canReply = canReplyToSiteManagementContacts(currentIdentity);
  const list = useQuery({
    enabled: !accessLost,
    queryKey: ["admin", "siteManagement", "contacts", ...actorScope, listType, page],
    queryFn: () => fetchSiteManagementContacts({ page, hasReply: unanswered ? "0" : undefined }),
  });
  const senderList = useQuery({
    queryKey: ["admin", "siteManagement", "contacts", ...actorScope, "sender", sender?.principalIdentifier, sender?.page],
    queryFn: () => fetchSiteManagementContacts({ principalIdentifier: sender!.principalIdentifier, page: sender!.page }),
    enabled: !accessLost && sender !== null && !list.isError,
  });
  const detail = useQuery({
    queryKey: ["admin", "siteManagement", "contact", ...actorScope, selected?.contactIdentifier],
    queryFn: () => fetchSiteManagementContactDetail({
      contactIdentifier: selected!.contactIdentifier,
    }),
    enabled: !accessLost && selected !== null && !list.isError,
  });
  const reply = useMutation({
    mutationFn: replyToSiteManagementContact,
    onSuccess: async (_result, variables) => {
      setContent("");
      setSelected(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "siteManagement", "contact", ...actorScope, variables.contactIdentifier] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "siteManagement", "contacts", ...actorScope] }),
        queryClient.invalidateQueries({ queryKey: ["myContacts", currentIdentity.identityIdentifier, currentIdentity.accountIdentifier, currentIdentity.siteManagementPrincipalIdentifier] }),
      ]);
    },
  });

  const accessDenied = [list.error, senderList.error, detail.error, reply.error].some((error) =>
    error && "status" in error && (error.status === 401 || error.status === 403));
  if (accessDenied && !accessLost) setAccessLost(true);
  useEffect(() => {
    if (accessLost || accessDenied) router.replace("/admin/site-management/contacts");
  }, [accessLost, accessDenied, router]);

  if (previousList !== listType) {
    setPreviousList(listType);
    setPage(1);
    if (!reply.isPending) {
      setSelected(null);
      setContent("");
      reply.reset();
    }
  }
  const lastPage = list.data && !list.isError ? Math.max(1, list.data.last_page) : page;
  if (page > lastPage) setPage(lastPage);
  const senderLastPage = senderList.data && !senderList.isError ? Math.max(1, senderList.data.last_page) : sender?.page;
  if (sender && senderLastPage && sender.page > senderLastPage) setSender({ ...sender, page: senderLastPage });

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
    setSender(null);
  };
  const viewSenderContacts = () => {
    const principalIdentifier = detail.data?.principalIdentifier;
    if (reply.isPending || detail.isLoading || detail.isError || !principalIdentifier) return;
    setSender((current) => current?.principalIdentifier === principalIdentifier ? current : { principalIdentifier, page: 1 });
    reply.reset();
    setContent("");
    setSelected(null);
  };

  if (accessLost || accessDenied) return <MyContactsClient />;

  return (
    <section className="grid gap-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 ref={headingRef} className="shrink-0 text-xl font-bold outline-none" tabIndex={-1}>{title}</h2>
          <label className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold">
            <input type="checkbox" checked={unanswered} disabled={reply.isPending} onChange={(event) => {
              if (reply.isPending) return;
              router.push(event.currentTarget.checked ? "/admin/site-management/contacts/manage?hasReply=0" : "/admin/site-management/contacts/manage", { scroll: false });
            }} />
            {text.unansweredOnly}
          </label>
        </div>
        <p className="text-sm text-text-muted">{unanswered ? text.description : text.allDescription}</p>
      </header>
      {list.isLoading ? <AccountStatusMessage variant="loading">{text.loading}</AccountStatusMessage> : null}
      {list.isError ? <AccountStatusMessage variant="error">{text.loadFailed}</AccountStatusMessage> : null}
      {!list.isLoading && !list.isError && list.data?.contacts.length === 0 ? <AccountStatusMessage variant="empty">{unanswered ? text.empty : text.allEmpty}</AccountStatusMessage> : null}
      <div className="grid gap-3">
        {!list.isError && list.data?.contacts.map((contact) => (
          <ContactCard key={contact.contactIdentifier} contact={contact} categoryLabel={text.category(contact.category)} replyCountLabel={t.myContacts.replyCount} locale={locale} disabled={reply.isPending} onOpen={openContact} />
        ))}
      </div>
      {!list.isError && list.data && list.data.last_page > 1 ? <div className="flex items-center justify-between gap-3 text-sm">
        <button className="rounded-lg border border-stroke-subtle px-3 py-2 disabled:opacity-60" disabled={reply.isPending || page <= 1} onClick={() => setPage(page - 1)} type="button">{text.previousPage}</button>
        <span>{text.page(list.data.current_page, list.data.last_page)}</span>
        <button className="rounded-lg border border-stroke-subtle px-3 py-2 disabled:opacity-60" disabled={reply.isPending || page >= list.data.last_page} onClick={() => setPage(page + 1)} type="button">{text.nextPage}</button>
      </div> : null}
      {!list.isError && (selected || sender) ? <ContactDialog title={selected ? title : text.senderContactsTitle} viewKey={selected?.contactIdentifier ?? `${sender?.principalIdentifier}:${sender?.page}`} fallbackFocusRef={headingRef} onClose={closeContact}
        closeLabel={text.close} closeDisabled={reply.isPending}
        savedName={selected && !detail.isLoading && !detail.isError && detail.data ? text.savedName(detail.data.name) : undefined}
        actions={selected && !detail.isLoading && !detail.isError && detail.data?.principalIdentifier ? <button className="rounded-lg border border-stroke-subtle px-3 py-2 text-sm disabled:opacity-60" disabled={reply.isPending} onClick={viewSenderContacts} type="button">{text.viewSenderContacts}</button> : null}>
          {!selected && sender ? <>
            {senderList.isLoading ? <AccountStatusMessage variant="loading">{text.loading}</AccountStatusMessage> : null}
            {senderList.isError ? <AccountStatusMessage variant="error">{text.loadFailed}</AccountStatusMessage> : null}
            {!senderList.isLoading && !senderList.isError && senderList.data?.contacts.length === 0 ? <AccountStatusMessage variant="empty">{text.allEmpty}</AccountStatusMessage> : null}
            {!senderList.isError ? senderList.data?.contacts.map((contact) => <ContactCard key={contact.contactIdentifier} contact={contact} categoryLabel={text.category(contact.category)} replyCountLabel={t.myContacts.replyCount} locale={locale} disabled={reply.isPending} onOpen={openContact} />) : null}
            {!senderList.isError && senderList.data && senderList.data.last_page > 1 ? <div className="flex items-center justify-between gap-3 text-sm">
              <button className="rounded-lg border border-stroke-subtle px-3 py-2 disabled:opacity-60" disabled={reply.isPending || sender.page <= 1} onClick={() => setSender({ ...sender, page: sender.page - 1 })} type="button">{text.previousPage}</button>
              <span>{text.page(senderList.data.current_page, senderList.data.last_page)}</span>
              <button className="rounded-lg border border-stroke-subtle px-3 py-2 disabled:opacity-60" disabled={reply.isPending || sender.page >= senderList.data.last_page} onClick={() => setSender({ ...sender, page: sender.page + 1 })} type="button">{text.nextPage}</button>
            </div> : null}
          </> : null}
          {selected ? <>
          {detail.isLoading ? <AccountStatusMessage variant="loading">{text.detailLoading}</AccountStatusMessage> : null}
          {detail.isError ? <AccountStatusMessage variant="error">{text.detailLoadFailed}</AccountStatusMessage> : null}
          {!detail.isError && detail.data ? <>
            <ContactDetail contact={{ ...detail.data, replies: detail.data.replies.map((item) => ({ ...item, author: item.name?.trim() ? text.replyAuthor(item.name) : text.unknownReplyAuthor })) }} categoryLabel={text.category(detail.data.category)} locale={locale} historyTitle={text.previousReplies} emptyHistory={text.noPreviousReplies} />
            {canReply ? <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); if (!reply.isPending && content.trim()) reply.mutate({ contactIdentifier: selected.contactIdentifier, content }); }}>
              <label className="grid gap-2 text-sm font-semibold">{text.replyContent}<textarea className="min-h-48 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 font-normal" disabled={reply.isPending} onChange={(event) => setContent(event.currentTarget.value)} required value={content} /></label>
              {reply.isError ? <AccountStatusMessage variant="error">{text.replyFailed}</AccountStatusMessage> : null}
              <button className="justify-self-start rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={reply.isPending || !content.trim()} type="submit">{reply.isPending ? text.replying : text.reply}</button>
            </form> : null}
          </> : null}
          </> : null}
      </ContactDialog> : null}
    </section>
  );
}
