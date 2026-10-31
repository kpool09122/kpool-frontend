"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ContactConversation } from "@/components/Contact/ContactConversation";
import { ContactReplyForm } from "@/components/Contact/ContactReplyForm";
import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import { UserStatusMessage } from "@/components/User";
import { fetchMyContactDetail, replyToMyContact } from "@/gateways/contact/contactBrowserApi";
import { canReplyToMyContacts } from "@/gateways/site-management/siteManagementPolicy";
import { useI18n } from "@/i18n/I18nProvider";
import { useAdmin } from "../../AdminProvider";

export function MyContactThread({ contactIdentifier }: { contactIdentifier: string }) {
  const { dictionary, locale } = useI18n();
  const { currentIdentity } = useAdmin();
  const text = dictionary.admin.myContacts;
  const conversation = dictionary.admin.contactConversation;
  const identityIdentifier = currentIdentity.identityIdentifier;
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [savedWithoutNotification, setSavedWithoutNotification] = useState(false);
  const detail = useQuery({
    queryKey: ["myContacts", identityIdentifier, contactIdentifier],
    queryFn: () => fetchMyContactDetail({ contactIdentifier, fallbackErrorMessage: text.detailLoadFailed }),
  });
  const reply = useMutation({
    mutationKey: ["myContacts", "reply", identityIdentifier],
    mutationFn: (replyContent: string) => replyToMyContact({
      contactIdentifier,
      content: replyContent,
      locale,
      fallbackErrorMessage: conversation.replyFailed,
    }),
    onMutate: () => {
      setSavedWithoutNotification(false);
      return { existingReplyIds: new Set(detail.data?.replies.map((item) => item.replyIdentifier)) };
    },
    onSuccess: async () => {
      setContent("");
      await queryClient.invalidateQueries({ queryKey: ["myContacts", identityIdentifier] });
    },
    onError: async (_error, replyContent, context) => {
      // Delivery can fail after persistence; refresh before offering another send.
      const refreshed = await detail.refetch();
      const saved = refreshed.data?.replies.some((item) =>
        context && !context.existingReplyIds.has(item.replyIdentifier) &&
        item.principalIdentifier === currentIdentity.siteManagementPrincipalIdentifier &&
        item.content === replyContent,
      );
      if (saved) {
        setContent("");
        setSavedWithoutNotification(true);
      }
      await queryClient.invalidateQueries({ queryKey: ["myContacts", identityIdentifier], exact: true });
    },
  });

  if (detail.isLoading) return <p>{text.detailLoading}</p>;
  if (detail.error) return <UserStatusMessage variant="error">{detail.error.message}</UserStatusMessage>;
  if (!detail.data) return null;
  const contact = detail.data;
  const canReply = canReplyToMyContacts(currentIdentity) && !!contact.principalIdentifier &&
    contact.principalIdentifier === currentIdentity.siteManagementPrincipalIdentifier;

  return (
    <div className="grid gap-4">
      <ContactConversation
        label={conversation.label}
        perspective="submitter"
        submitterName={conversation.you}
        operatorLabel={conversation.operator}
        initialMessage={{ content: contact.content, date: <LocalizedDateTime value={contact.createdAt} /> }}
        replies={contact.replies.map((item) => ({
          id: item.replyIdentifier,
          content: item.content,
          date: <LocalizedDateTime value={item.sentAt ?? item.createdAt} />,
          fromSubmitter: !!contact.principalIdentifier && item.principalIdentifier === contact.principalIdentifier,
        }))}
      />
      {canReply ? <ContactReplyForm
        content={content}
        onChange={(value) => { setContent(value); reply.reset(); setSavedWithoutNotification(false); }}
        onSubmit={() => reply.mutate(content.trim())}
        pending={reply.isPending}
        labels={conversation}
        feedback={savedWithoutNotification
          ? <UserStatusMessage variant="warning">{conversation.replySavedNotificationFailed}</UserStatusMessage>
          : reply.isError ? <UserStatusMessage variant="error">{conversation.replyFailed}</UserStatusMessage> : null}
      /> : null}
    </div>
  );
}
