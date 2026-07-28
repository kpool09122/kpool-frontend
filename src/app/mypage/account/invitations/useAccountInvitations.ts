import { useState } from "react";

import { inviteAccountMembers } from "@/gateways/account/accountBrowserApi";
import type { WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import type { useI18n } from "../../../i18n/I18nProvider";
import type { MyPageAccountInvitationState } from "../../myPageTypes";
import { accountInvitationEmailPattern, maxAccountInvitationEmails } from "../accountInvitationRules";

type UseAccountInvitationsParams = {
  accountIdentifier: string | null;
  canInvite: boolean;
  principalState: WikiPrincipalState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
};

export const useAccountInvitations = ({
  accountIdentifier,
  canInvite,
  principalState,
  t,
}: UseAccountInvitationsParams) => {
  const [state, setState] = useState<MyPageAccountInvitationState>(() => ({
    emailInput: "",
    emails: [],
    error: null,
    isSending: false,
    success: null,
  }));

  const updateEmailInput = (value: string) => {
    setState((current) => ({
      ...current,
      emailInput: value,
      error: null,
      success: null,
    }));
  };

  const addEmail = () => {
    const email = state.emailInput.trim().toLowerCase();

    if (!email) {
      setState((current) => ({ ...current, error: t.accountInvitationEmailRequired, success: null }));
      return;
    }

    if (!accountInvitationEmailPattern.test(email)) {
      setState((current) => ({ ...current, error: t.accountInvitationEmailInvalid, success: null }));
      return;
    }

    if (state.emails.includes(email)) {
      setState((current) => ({ ...current, error: t.accountInvitationEmailDuplicate, success: null }));
      return;
    }

    if (state.emails.length >= maxAccountInvitationEmails) {
      setState((current) => ({ ...current, error: t.accountInvitationEmailLimit, success: null }));
      return;
    }

    setState((current) => ({
      ...current,
      emailInput: "",
      emails: [...current.emails, email],
      error: null,
      success: null,
    }));
  };

  const removeEmail = (email: string) => {
    setState((current) => ({
      ...current,
      emails: current.emails.filter((candidate) => candidate !== email),
      error: null,
      success: null,
    }));
  };

  const sendInvitations = () => {
    if (!accountIdentifier || principalState.status !== "available") {
      setState((current) => ({ ...current, error: t.accountSettingsUnavailable, success: null }));
      return;
    }

    if (!canInvite) {
      setState((current) => ({ ...current, error: t.accountInvitationReadOnly, success: null }));
      return;
    }

    if (state.emails.length === 0) {
      setState((current) => ({ ...current, error: t.accountInvitationEmailListRequired, success: null }));
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      isSending: true,
      success: null,
    }));

    void inviteAccountMembers({
      fallbackErrorMessage: t.accountInvitationSendFailed,
      requestBody: {
        accountIdentifier,
        inviterPrincipalIdentifier: principalState.principal.principalIdentifier,
        emails: state.emails,
      },
    }).then(() => {
      setState({
        emailInput: "",
        emails: [],
        error: null,
        isSending: false,
        success: t.accountInvitationSent,
      });
    }).catch((error: unknown) => {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : t.accountInvitationSendFailed,
        isSending: false,
        success: null,
      }));
    });
  };

  return {
    state,
    addEmail,
    removeEmail,
    sendInvitations,
    updateEmailInput,
  };
};
