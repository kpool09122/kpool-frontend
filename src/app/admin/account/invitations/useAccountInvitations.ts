import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { inviteAccountMembers } from "@/gateways/account/accountBrowserApi";
import type { InvitationSummary } from "@/gateways/account/accountApi";
import type { useI18n } from "../../../../i18n/I18nProvider";
import type { AdminAccountInvitationState } from "../../adminTypes";
import { accountInvitationEmailPattern, maxAccountInvitationEmails } from "../accountInvitationRules";

type UseAccountInvitationsParams = {
  accountIdentifier: string | null;
  accountPrincipalIdentifier: string | null;
  canInvite: boolean;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const useAccountInvitations = ({
  accountIdentifier,
  accountPrincipalIdentifier,
  canInvite,
  t,
}: UseAccountInvitationsParams) => {
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const inviteMutation = useMutation<InvitationSummary[], Error, string[]>({
    mutationFn: (nextEmails) => {
      if (!accountIdentifier || !accountPrincipalIdentifier) {
        return Promise.reject(new Error(t.accountSettingsUnavailable));
      }

      if (!canInvite) {
        return Promise.reject(new Error(t.accountInvitationReadOnly));
      }

      return inviteAccountMembers({
        fallbackErrorMessage: t.accountInvitationSendFailed,
        requestBody: {
          accountIdentifier,
          inviterPrincipalIdentifier: accountPrincipalIdentifier,
          emails: nextEmails,
        },
      });
    },
    onMutate: () => {
      setError(null);
      setSuccess(null);
    },
    onSuccess: () => {
      setEmailInput("");
      setEmails([]);
      setSuccess(t.accountInvitationSent);
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, t.accountInvitationSendFailed));
    },
  });

  const updateEmailInput = (value: string) => {
    setEmailInput(value);
    setError(null);
    setSuccess(null);
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();

    if (!email) {
      setError(t.accountInvitationEmailRequired);
      setSuccess(null);
      return;
    }

    if (!accountInvitationEmailPattern.test(email)) {
      setError(t.accountInvitationEmailInvalid);
      setSuccess(null);
      return;
    }

    if (emails.includes(email)) {
      setError(t.accountInvitationEmailDuplicate);
      setSuccess(null);
      return;
    }

    if (emails.length >= maxAccountInvitationEmails) {
      setError(t.accountInvitationEmailLimit);
      setSuccess(null);
      return;
    }

    setEmailInput("");
    setEmails((current) => [...current, email]);
    setError(null);
    setSuccess(null);
  };

  const removeEmail = (email: string) => {
    setEmails((current) => current.filter((candidate) => candidate !== email));
    setError(null);
    setSuccess(null);
  };

  const sendInvitations = () => {
    if (!accountIdentifier || !accountPrincipalIdentifier) {
      setError(t.accountSettingsUnavailable);
      setSuccess(null);
      return;
    }

    if (!canInvite) {
      setError(t.accountInvitationReadOnly);
      setSuccess(null);
      return;
    }

    if (emails.length === 0) {
      setError(t.accountInvitationEmailListRequired);
      setSuccess(null);
      return;
    }

    inviteMutation.mutate(emails);
  };

  const state: AdminAccountInvitationState = {
    emailInput,
    emails,
    error,
    isSending: inviteMutation.isPending,
    success,
  };

  return {
    state,
    addEmail,
    removeEmail,
    sendInvitations,
    updateEmailInput,
  };
};
