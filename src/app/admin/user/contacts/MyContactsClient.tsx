"use client";

import { ContactCard } from "@/components/Contact/ContactCard";
import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import { useIsMutating, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AccountStatusMessage } from "@/components/Account";
import { UserSettingsPanel, UserStatusMessage } from "@/components/User";
import { hasLatestSupportReply } from "@/gateways/contact/contactApi";
import { fetchMyContacts } from "@/gateways/contact/contactBrowserApi";
import { useI18n } from "../../../../i18n/I18nProvider";
import { useAdmin } from "../../AdminProvider";
import { MyContactThread } from "./MyContactThread";

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
  const replying = useIsMutating({ mutationKey: ["myContacts", "reply", identityIdentifier] }) > 0;
  const contacts = (list.data ?? []).filter((contact) =>
    !repliedOnly || hasLatestSupportReply(contact));

  return (
    <UserSettingsPanel title={t.title}>
      <div className="mt-5 grid gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={repliedOnly}
            disabled={replying}
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
          <AccountStatusMessage variant="empty">{t.empty}</AccountStatusMessage>
        ) : null}
        {contacts.map((contact) => {
          const replied = hasLatestSupportReply(contact);
          const isSelected = selectedId === contact.contactIdentifier;

          return (
            <ContactCard
              key={contact.contactIdentifier}
              date={<LocalizedDateTime value={contact.createdAt} />}
              category={t.category(contact.category)}
              content={contact.content}
              replied={replied}
              statusLabel={replied ? t.replied : t.awaitingReply}
              expanded={isSelected}
              disabled={replying}
              onToggle={() => { if (!replying) setSelectedId(isSelected ? null : contact.contactIdentifier); }}
            >
              <MyContactThread contactIdentifier={contact.contactIdentifier} />
            </ContactCard>
          );
        })}
      </div>
    </UserSettingsPanel>
  );
}
