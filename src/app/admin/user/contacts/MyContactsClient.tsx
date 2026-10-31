"use client";

import { ContactConversation } from "@/components/Contact/ContactConversation";
import { ContactCard } from "@/components/Contact/ContactCard";
import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { UserSettingsPanel, UserStatusMessage } from "@/components/User";
import { fetchMyContactDetail, fetchMyContacts } from "@/gateways/contact/contactBrowserApi";
import { useI18n } from "../../../../i18n/I18nProvider";
import { useAdmin } from "../../AdminProvider";

export function MyContactsClient() {
  const { dictionary } = useI18n();
  const { currentIdentity } = useAdmin();
  const t = dictionary.admin.myContacts;
  const identityIdentifier = currentIdentity.identityIdentifier;
  const [repliedOnly, setRepliedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["myContacts", identityIdentifier],
    queryFn: () => fetchMyContacts({ fallbackErrorMessage: t.loadFailed }),
  });
  const detail = useQuery({
    enabled: selectedId !== null,
    queryKey: ["myContacts", identityIdentifier, selectedId],
    queryFn: () => fetchMyContactDetail({
      contactIdentifier: selectedId!,
      fallbackErrorMessage: t.detailLoadFailed,
    }),
  });
  const contacts = (list.data ?? []).filter((contact) =>
    !repliedOnly || contact.replyIdentifiers.length > 0);

  return (
    <UserSettingsPanel title={t.title}>
      <div className="mt-5 grid gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={repliedOnly}
            onChange={(event) => {
              setRepliedOnly(event.currentTarget.checked);
              setSelectedId(null);
            }}
          />
          {t.repliedOnly}
        </label>
        {list.isLoading ? <UserStatusMessage variant="warning">{t.loading}</UserStatusMessage> : null}
        {list.error ? <UserStatusMessage variant="error">{list.error.message}</UserStatusMessage> : null}
        {!list.isLoading && !list.error && contacts.length === 0 ? (
          <UserStatusMessage variant="warning">{t.empty}</UserStatusMessage>
        ) : null}
        {contacts.map((contact) => {
          const isSelected = selectedId === contact.contactIdentifier;

          return (
            <ContactCard
              key={contact.contactIdentifier}
              date={<LocalizedDateTime value={contact.createdAt} />}
              category={t.category(contact.category)}
              content={contact.content}
              replied={contact.replyIdentifiers.length > 0}
              statusLabel={contact.replyIdentifiers.length ? t.replied : t.awaitingReply}
              expanded={isSelected}
              onToggle={() => setSelectedId(isSelected ? null : contact.contactIdentifier)}
            >
              {detail.isLoading ? <p>{t.detailLoading}</p> : null}
              {detail.error ? <UserStatusMessage variant="error">{detail.error.message}</UserStatusMessage> : null}
              {!detail.error && detail.data ? (
                <ContactConversation
                  label={dictionary.admin.contactConversation.label}
                  perspective="submitter"
                  submitterName={dictionary.admin.contactConversation.you}
                  operatorLabel={dictionary.admin.contactConversation.operator}
                  initialMessage={{ content: detail.data.content, date: <LocalizedDateTime value={detail.data.createdAt} /> }}
                  replies={detail.data.replies.map((reply) => ({
                    id: reply.replyIdentifier,
                    content: reply.content,
                    date: <LocalizedDateTime value={reply.sentAt} />,
                    fromSubmitter: reply.replyType === "submitter",
                  }))}
                />
              ) : null}
            </ContactCard>
          );
        })}
      </div>
    </UserSettingsPanel>
  );
}
