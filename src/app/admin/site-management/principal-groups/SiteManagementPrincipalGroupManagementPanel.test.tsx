import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { updateSiteManagementUserGroups, areSiteManagementMembershipsEqual } from "./membershipModel";
import { dictionaries } from "@/i18n/dictionaries";
import { SiteManagementPrincipalGroupManagementPanel } from "./SiteManagementPrincipalGroupManagementPanel";
import type { SiteManagementMemberships, SiteManagementPrincipalGroupState } from "./types";

const t = dictionaries.ja.admin.siteManagementPrincipalGroups;
const user = { principalIdentifier: "u", identityName: "User", email: "user@example.com" };
const state: SiteManagementPrincipalGroupState = {
  users: [user],
  groups: [{ principalGroupIdentifier: "g", name: "General", roles: ["General"] }],
  membershipByGroup: {}, canManage: true, hasUnsavedChanges: false,
  isLoading: false, isSaving: false, loadError: null, saveError: null, success: null,
};
afterEach(cleanup);

it.each([
  { isLoading: true }, { isSaving: true }, { canManage: false }, { loadError: "Load failed" },
])("blocks edits and saves for state %j", (override) => {
  const actions = { updateUserGroups: vi.fn(), save: vi.fn(), load: vi.fn() };
  render(<SiteManagementPrincipalGroupManagementPanel state={{ ...state, hasUnsavedChanges: true, ...override }} actions={actions} t={t} />);
  expect(screen.getByRole("button", { name: override.isSaving ? t.saving : t.save })).toBeDisabled();
  expect(screen.getByRole("button", { name: t.edit })).toBeDisabled();
  expect(screen.getByRole("button", { name: t.reload })).toBeDisabled();
});

it("blocks an already open dialog after permission loss or processing begins", () => {
  const actions = { updateUserGroups: vi.fn(), save: vi.fn(), load: vi.fn() };
  const { rerender } = render(<SiteManagementPrincipalGroupManagementPanel state={state} actions={actions} t={t} />);
  fireEvent.click(screen.getByRole("button", { name: t.edit }));
  fireEvent.click(screen.getByLabelText("General"));
  for (const override of [{ canManage: false }, { isSaving: true }, { isLoading: true }]) {
    rerender(<SiteManagementPrincipalGroupManagementPanel state={{ ...state, ...override }} actions={actions} t={t} />);
    expect(screen.getByLabelText("General")).toBeDisabled();
    expect(screen.getByRole("button", { name: t.confirm })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: t.confirm }));
  }
  expect(actions.updateUserGroups).not.toHaveBeenCalled();
});

it("distinguishes load failure, loading and legitimate empty states and retries only loading", () => {
  const actions = { updateUserGroups: vi.fn(), save: vi.fn(), load: vi.fn() };
  const empty = { ...state, users: [], groups: [] };
  const { rerender } = render(<SiteManagementPrincipalGroupManagementPanel state={{ ...empty, loadError: "Load failed" }} actions={actions} t={t} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Load failed");
  expect(screen.queryByText(t.noUsers)).not.toBeInTheDocument();
  expect(screen.queryByText(t.noGroups)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: t.reload }));
  expect(actions.load).toHaveBeenCalledOnce();
  expect(actions.save).not.toHaveBeenCalled();
  rerender(<SiteManagementPrincipalGroupManagementPanel state={{ ...empty, isLoading: true }} actions={actions} t={t} />);
  expect(screen.getByText(t.loading)).toBeInTheDocument();
  expect(screen.queryByText(t.noUsers)).not.toBeInTheDocument();
  rerender(<SiteManagementPrincipalGroupManagementPanel state={empty} actions={actions} t={t} />);
  expect(screen.getByText(t.noUsers)).toBeInTheDocument();
  expect(screen.getByText(t.noGroups)).toBeInTheDocument();
});

it("filters mixed Operator groups without excluding General or Administrator", () => {
  const actions = { updateUserGroups: vi.fn(), save: vi.fn(), load: vi.fn() };
  render(<SiteManagementPrincipalGroupManagementPanel state={{ ...state, groups: [
    ...state.groups,
    { principalGroupIdentifier: "a", name: "Administrators", roles: ["Administrator"] },
    { principalGroupIdentifier: "o", name: "Operators", roles: ["Operator", "General"] },
  ], membershipByGroup: { o: ["u"] } }} actions={actions} t={t} />);
  expect(screen.getByText("Operators")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: t.edit }));
  expect(screen.queryByRole("checkbox", { name: "Operators" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("General"));
  fireEvent.click(screen.getByLabelText("Administrators"));
  fireEvent.click(screen.getByRole("button", { name: t.confirm }));
  expect(actions.updateUserGroups).toHaveBeenCalledWith("u", ["g", "a"]);
});

it("disables editing when only Operator groups exist", () => {
  render(<SiteManagementPrincipalGroupManagementPanel state={{ ...state, groups: [{ principalGroupIdentifier: "o", name: "Operators", roles: ["Operator"] }] }} actions={{ updateUserGroups: vi.fn(), save: vi.fn(), load: vi.fn() }} t={t} />);
  expect(screen.getByText(t.noGroups)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: t.edit })).toBeDisabled();
});

it.each(["ja", "en", "ko"] as const)("renders dedicated %s copy and display name fallbacks", (locale) => {
  const copy = dictionaries[locale].admin.siteManagementPrincipalGroups;
  expect(Object.keys(copy).sort()).toEqual(Object.keys(t).sort());
  render(<SiteManagementPrincipalGroupManagementPanel state={{ ...state, users: [
    { principalIdentifier: "email", identityName: " ", email: "fallback@example.com" },
    { principalIdentifier: "identifier", identityName: "", email: "" },
  ] }} actions={{ updateUserGroups: vi.fn(), save: vi.fn(), load: vi.fn() }} t={copy} />);
  expect(screen.getByRole("heading", { name: copy.title })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "fallback@example.com" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "identifier" })).toBeInTheDocument();
});

it("Escape cancels dialog changes and restores focus", () => {
  const actions = { updateUserGroups: vi.fn(), save: vi.fn(), load: vi.fn() };
  render(<SiteManagementPrincipalGroupManagementPanel state={state} actions={actions} t={t} />);
  const opener = screen.getByRole("button", { name: t.edit });
  opener.focus();
  fireEvent.click(opener);
  const dialog = screen.getByRole("dialog", { name: t.dialogTitle("User") });
  fireEvent.click(screen.getByLabelText("General"));
  fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
  expect(actions.updateUserGroups).not.toHaveBeenCalled();
});

it("keeps cleared memberships editable on save failure, retries save, and reverting clears dirty state", () => {
  const saved = { g: ["u"] };
  const save = vi.fn();
  const load = vi.fn();
  function Harness() {
    const [draft, setDraft] = useState<SiteManagementMemberships>(saved);
    return <SiteManagementPrincipalGroupManagementPanel state={{ ...state, membershipByGroup: draft,
      hasUnsavedChanges: !areSiteManagementMembershipsEqual(saved, draft), saveError: "Save failed" }}
      actions={{ load, save, updateUserGroups: (identifier, groups) => setDraft(updateSiteManagementUserGroups(draft, state.groups, identifier, groups)) }} t={t} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: t.edit }));
  fireEvent.click(screen.getByLabelText("General"));
  fireEvent.click(screen.getByRole("button", { name: t.confirm }));
  expect(screen.getByText(t.unsaved)).toBeInTheDocument();
  expect(screen.getByText(t.unassigned)).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
  expect(screen.getByRole("button", { name: t.reload })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: t.retrySave }));
  expect(save).toHaveBeenCalledOnce();
  expect(load).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: t.edit }));
  expect(screen.getByLabelText("General")).not.toBeChecked();
  fireEvent.click(screen.getByLabelText("General"));
  fireEvent.click(screen.getByRole("button", { name: t.confirm }));
  expect(screen.queryByText(t.unsaved)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: t.save })).toBeDisabled();
});

it("displays success without changing the controlled draft", () => {
  render(<SiteManagementPrincipalGroupManagementPanel state={{ ...state, success: "Saved" }} actions={{ updateUserGroups: vi.fn(), save: vi.fn(), load: vi.fn() }} t={t} />);
  expect(screen.getByRole("status")).toHaveTextContent("Saved");
});


it("does not allow confirming an unchanged dialog", () => {
  const actions = { updateUserGroups: vi.fn(), save: vi.fn(), load: vi.fn() };
  render(<SiteManagementPrincipalGroupManagementPanel state={state} actions={actions} t={t} />);
  fireEvent.click(screen.getByRole("button", { name: t.edit }));
  expect(screen.getByRole("button", { name: t.confirm })).toBeDisabled();
});

it("shows an independently supplied unassigned user and applies only a dialog draft before saving", () => {
  const actions = { updateUserGroups: vi.fn(), save: vi.fn(), load: vi.fn() };
  const { rerender } = render(<SiteManagementPrincipalGroupManagementPanel state={state} actions={actions} t={t} />);
  expect(screen.getByText(user.email)).toBeInTheDocument();
  expect(screen.getByText(t.unassigned)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: t.save })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: t.edit }));
  fireEvent.click(screen.getByLabelText("General"));
  fireEvent.click(screen.getByRole("button", { name: t.confirm }));
  expect(actions.updateUserGroups).toHaveBeenCalledWith("u", ["g"]);
  expect(actions.save).not.toHaveBeenCalled();
  rerender(<SiteManagementPrincipalGroupManagementPanel state={{ ...state, membershipByGroup: { g: ["u"] }, hasUnsavedChanges: true }} actions={actions} t={t} />);
  fireEvent.click(screen.getByRole("button", { name: t.save }));
  expect(actions.save).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: t.edit }));
  expect(within(screen.getByRole("dialog")).getByLabelText("General")).toBeChecked();
  fireEvent.click(screen.getByLabelText("General"));
  fireEvent.click(screen.getByRole("button", { name: t.cancel }));
  expect(actions.updateUserGroups).toHaveBeenCalledOnce();
});
