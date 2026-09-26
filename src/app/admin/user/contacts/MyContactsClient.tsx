"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { UserSettingsPanel, UserStatusMessage } from "@/components/User";
import { fetchMyContactDetail, fetchMyContacts } from "@/gateways/contact/contactBrowserApi";
import { useI18n } from "../../../../i18n/I18nProvider";

type StatusFilter = "all" | "replied" | "awaitingReply";

const formatContactDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Tokyo",
    year: "numeric",
  }).formatToParts(date);
  const valueFor = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")} ${valueFor("hour")}:${valueFor("minute")}`;
};

export function MyContactsClient() {
  const { dictionary } = useI18n();
  const t = dictionary.admin.myContacts;
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["myContacts"],
    queryFn: () => fetchMyContacts({ fallbackErrorMessage: t.loadFailed }),
  });
  const detail = useQuery({
    enabled: selectedId !== null,
    queryKey: ["myContacts", selectedId],
    queryFn: () => fetchMyContactDetail({
      contactIdentifier: selectedId!,
      fallbackErrorMessage: t.detailLoadFailed,
    }),
  });
  const contacts = (list.data ?? []).filter((contact) =>
    status === "all" || (status === "replied"
      ? contact.replyIdentifiers.length > 0
      : contact.replyIdentifiers.length === 0));

  return (
    <UserSettingsPanel description={t.description} title={t.title}>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-semibold">
          {t.filter}
          <select
            className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
            value={status}
            onChange={(event) => setStatus(event.currentTarget.value as StatusFilter)}
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
        {contacts.map((contact) => {
          const isSelected = selectedId === contact.contactIdentifier;

          return (
            <article className="overflow-hidden rounded-xl border border-stroke-subtle bg-surface-raised" key={contact.contactIdentifier}>
              <button
                aria-expanded={isSelected}
                className="w-full p-4 text-left transition hover:border-brand-primary hover:bg-brand-highlight/10"
                onClick={() => setSelectedId(isSelected ? null : contact.contactIdentifier)}
                type="button"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-text-muted">{formatContactDate(contact.createdAt)}</span>
                    <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-900">
                      {t.category(contact.category)}
                    </span>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    contact.replyIdentifiers.length
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-100 text-amber-900"
                  }`}>
                    {contact.replyIdentifiers.length ? t.replied : t.awaitingReply}
                  </span>
                </div>
              </button>
              {isSelected ? (
                <section className="border-t border-stroke-subtle bg-white p-4">
                  {detail.isLoading ? <p>{t.detailLoading}</p> : null}
                  {detail.error ? <UserStatusMessage variant="error">{detail.error.message}</UserStatusMessage> : null}
                  {detail.data ? (
                    <div className="grid gap-4">
                      <p className="whitespace-pre-wrap">{detail.data.content}</p>
                      <div className="relative ml-3 grid gap-3 pl-5">
                        <span aria-hidden="true" className="absolute left-0 top-0 h-5 w-3 border-b border-l border-stroke-subtle" />
                        {detail.data.replies.length ? detail.data.replies.map((reply) => (
                          <article className="relative border-l-4 border-brand-highlight bg-surface-raised py-3 pl-4 pr-3" key={reply.replyIdentifier}>
                            <p className="whitespace-pre-wrap">{reply.content}</p>
                            <p className="mt-2 text-xs text-text-muted">{formatContactDate(reply.sentAt)}</p>
                          </article>
                        )) : <p className="text-sm text-text-muted">{t.noReplies}</p>}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </article>
          );
        })}
      </div>
    </UserSettingsPanel>
  );
}
