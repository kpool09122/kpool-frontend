import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "../../../../i18n/dictionaries";
import { PrincipalGroupManagementPanel } from "./PrincipalGroupManagementPanel";

const t = dictionaries.ja.admin;

const groupA = {
  principalGroupIdentifier: "33333333-3333-4333-8333-333333333333",
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  name: "Account Editors",
  roleIdentifiers: [],
  isDefault: false,
  members: [],
};

const groupB = {
  principalGroupIdentifier: "44444444-4444-4444-8444-444444444444",
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  name: "Account Reviewers",
  roleIdentifiers: [],
  isDefault: false,
  members: [],
};

const member = {
  principalIdentifier: "11111111-1111-4111-8111-111111111111",
  identityIdentifier: "55555555-5555-4555-8555-555555555555",
  identityName: "編集者ユーザー",
  email: "editor@example.com",
  principalGroups: [
    {
      principalGroupIdentifier: groupA.principalGroupIdentifier,
      name: groupA.name,
      isDefault: false,
    },
  ],
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
  state: {
    error: null,
    groups: [groupA, groupB],
    isLoading: false,
    isSaving: false,
    members: [member],
    membershipByGroup: {
      [groupA.principalGroupIdentifier]: [member.principalIdentifier],
      [groupB.principalGroupIdentifier]: [],
    },
    success: null,
  },
});

describe("PrincipalGroupManagementPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows current groups and applies multiple selections to the on-screen draft", () => {
    const updateUserGroups = vi.fn();

    render(
      <PrincipalGroupManagementPanel
        canManage
        principalGroups={createPrincipalGroups({ updateUserGroups })}
        t={t}
      />,
    );

    expect(screen.getByText("Account Editors")).toBeInTheDocument();
    expect(screen.queryByText(t.principalGroupUnsavedChanges)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: t.principalGroupEditUserGroups }));
    expect(screen.getByLabelText("Account Editors")).toBeChecked();
    fireEvent.click(screen.getByLabelText("Account Reviewers"));
    fireEvent.click(screen.getByRole("button", { name: t.principalGroupDialogConfirm }));

    expect(updateUserGroups).toHaveBeenCalledWith(member.principalIdentifier, [
      groupA.principalGroupIdentifier,
      groupB.principalGroupIdentifier,
    ]);
  });

  it("keeps the page save button disabled until a draft change exists", () => {
    const { rerender } = render(
      <PrincipalGroupManagementPanel
        canManage
        principalGroups={createPrincipalGroups({ hasUnsavedChanges: false })}
        t={t}
      />,
    );

    expect(screen.getByRole("button", { name: t.principalGroupSave })).toBeDisabled();

    rerender(
      <PrincipalGroupManagementPanel
        canManage
        principalGroups={createPrincipalGroups({ hasUnsavedChanges: true })}
        t={t}
      />,
    );

    expect(screen.getByRole("button", { name: t.principalGroupSave })).toBeEnabled();
    expect(screen.getByText(t.principalGroupUnsavedChanges)).toBeInTheDocument();
  });
});
