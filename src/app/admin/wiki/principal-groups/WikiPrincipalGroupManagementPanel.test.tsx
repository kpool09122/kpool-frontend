import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "../../../../i18n/dictionaries";
import { WikiPrincipalGroupManagementPanel } from "./WikiPrincipalGroupManagementPanel";

const t = dictionaries.ja.admin;

const groupA = {
  principalGroupIdentifier: "33333333-3333-4333-8333-333333333333",
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  name: "Wiki Editors",
  roleIdentifiers: [],
  isDefault: false,
  members: [],
};

const groupB = {
  principalGroupIdentifier: "44444444-4444-4444-8444-444444444444",
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  name: "Wiki Reviewers",
  roleIdentifiers: [],
  isDefault: false,
  members: [],
};

const user = {
  principalIdentifier: "11111111-1111-4111-8111-111111111111",
  identityIdentifier: "55555555-5555-4555-8555-555555555555",
  identityName: "編集者ユーザー",
  email: "editor@example.com",
};

const createPrincipalGroups = ({
  hasUnsavedChanges = false,
  updateUserGroups = vi.fn(),
} = {}) => ({
  hasUnsavedChanges,
  isBusy: false,
  load: vi.fn(),
  save: vi.fn(),
  updateUserGroups,
  userByIdentifier: new Map([[user.principalIdentifier, user]]),
  state: {
    error: null,
    groups: [groupA, groupB],
    isLoading: false,
    isSaving: false,
    membershipByGroup: {
      [groupA.principalGroupIdentifier]: [user.principalIdentifier],
      [groupB.principalGroupIdentifier]: [],
    },
    success: null,
    users: [user],
  },
});

describe("WikiPrincipalGroupManagementPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("updates only the on-screen draft when the user group dialog is confirmed", () => {
    const updateUserGroups = vi.fn();

    render(
      <WikiPrincipalGroupManagementPanel
        canManage
        principalGroups={createPrincipalGroups({ updateUserGroups })}
        t={t}
      />,
    );

    expect(screen.getByText("Wiki Editors")).toBeInTheDocument();
    expect(screen.queryByText(t.wikiPrincipalGroupUnsavedChanges)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: t.wikiPrincipalGroupEditUserGroups }));
    fireEvent.click(screen.getByLabelText("Wiki Reviewers"));
    fireEvent.click(screen.getByRole("button", { name: t.wikiPrincipalGroupDialogConfirm }));

    expect(updateUserGroups).toHaveBeenCalledWith(user.principalIdentifier, [
      groupA.principalGroupIdentifier,
      groupB.principalGroupIdentifier,
    ]);
  });

  it("keeps the page save button disabled until a draft change exists", () => {
    const { rerender } = render(
      <WikiPrincipalGroupManagementPanel
        canManage
        principalGroups={createPrincipalGroups({ hasUnsavedChanges: false })}
        t={t}
      />,
    );

    expect(screen.getByRole("button", { name: t.wikiPrincipalGroupSave })).toBeDisabled();

    rerender(
      <WikiPrincipalGroupManagementPanel
        canManage
        principalGroups={createPrincipalGroups({ hasUnsavedChanges: true })}
        t={t}
      />,
    );

    expect(screen.getByRole("button", { name: t.wikiPrincipalGroupSave })).toBeEnabled();
    expect(screen.getByText(t.wikiPrincipalGroupUnsavedChanges)).toBeInTheDocument();
  });
});
