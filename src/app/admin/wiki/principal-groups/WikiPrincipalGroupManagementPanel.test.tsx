import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "../../../../i18n/dictionaries";
import { WikiPrincipalGroupManagementPanel } from "./WikiPrincipalGroupManagementPanel";

const t = dictionaries.ja.admin;
afterEach(cleanup);

const groupA = {
  principalGroupIdentifier: "33333333-3333-4333-8333-333333333333",
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  name: "Wiki Editors",
  description: "Creates and edits Wiki drafts and submits them for review.",
  isMembershipEditable: true,
  roleIdentifiers: [],
  isDefault: false,
  members: [],
};

const groupB = {
  principalGroupIdentifier: "44444444-4444-4444-8444-444444444444",
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  name: "Wiki Reviewers",
  isMembershipEditable: true,
  roleIdentifiers: [],
  isDefault: false,
  members: [],
};

const user = {
  status: "active" as const,
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
  accessStatus: null,
  updateUserStatus: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  updateUserGroups,
  userByIdentifier: new Map([[user.principalIdentifier, user]]),
  state: {
    error: null,
    canManage: true, hasUnsavedChanges, canRetryRefresh: false, loadError: null, saveError: null,
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
    expect(screen.getByLabelText("Wiki Editors")).toHaveAccessibleDescription(groupA.description);
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


it("stages status from the user row without saving or opening the group dialog", () => {
  const principalGroups = createPrincipalGroups();
  const { rerender } = render(<WikiPrincipalGroupManagementPanel canManage principalGroups={principalGroups} t={t} />);
  const toggle = screen.getByRole("switch", { name: t.principalStatus.label });
  fireEvent.click(toggle);
  expect(principalGroups.updateUserStatus).toHaveBeenCalledWith(user.principalIdentifier, "suspended");
  expect(principalGroups.save).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: t.wikiPrincipalGroupEditUserGroups }));
  expect(within(screen.getByRole("dialog")).queryByRole("combobox")).not.toBeInTheDocument();
  expect(within(screen.getByRole("dialog")).queryByRole("switch")).not.toBeInTheDocument();
  rerender(<WikiPrincipalGroupManagementPanel canManage={false} principalGroups={principalGroups} t={t} />);
  expect(toggle).toBeDisabled();
});


it("shows system-managed memberships but disables both joining and leaving them", () => {
  const principalGroups = createPrincipalGroups();
  principalGroups.state.groups = [
    { ...groupA, name: "Collaborator", isMembershipEditable: false },
    { ...groupB, name: "Senior Collaborator", isMembershipEditable: false },
    { ...groupB, principalGroupIdentifier: "editable", name: "Administrators" },
  ];
  render(<WikiPrincipalGroupManagementPanel canManage principalGroups={principalGroups} t={t} />);
  expect(screen.getByText("Collaborator")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: t.wikiPrincipalGroupEditUserGroups }));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByRole("checkbox", { name: "Collaborator" })).toBeChecked();
  expect(dialog.getByRole("checkbox", { name: "Collaborator" })).toBeDisabled();
  expect(dialog.getByRole("checkbox", { name: "Senior Collaborator" })).not.toBeChecked();
  expect(dialog.getByRole("checkbox", { name: "Senior Collaborator" })).toBeDisabled();
  expect(dialog.getByRole("checkbox", { name: "Administrators" })).toBeEnabled();
});
