"use client";
import { PrincipalGroupMembershipOption } from "@/components/PrincipalGroupMembershipOption";
import type { MonetizationGroup, MonetizationMember } from "@/gateways/monetization/monetizationPrincipal";
import type { useI18n } from "@/i18n/I18nProvider";
import type { usePrincipalGroupEditor } from "../principal-groups/usePrincipalGroupEditor";
type Text = ReturnType<typeof useI18n>["dictionary"]["admin"];
export function MonetizationGroupPanel({ editor, t, statusText }: {
  editor: ReturnType<typeof usePrincipalGroupEditor<MonetizationGroup, MonetizationMember>>;
  t: Text["monetization"]; statusText: Text["principalStatus"];
}) {
  const { state, actions } = editor;
  const error = state.saveError ?? state.loadError;
  return <section aria-label={t.manage} className="min-w-0 space-y-5 rounded-xl border border-stroke-subtle bg-surface-raised p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">{t.manage}</h2>
      <button type="button" className="rounded-lg bg-brand-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-50" disabled={!state.canManage || !state.hasUnsavedChanges} onClick={actions.save}>{state.isSaving ? t.saving : t.save}</button>
    </div>
    {state.isLoading ? <p role="status">{t.loading}</p> : null}
    {error || state.canRetryRefresh ? <div role="alert"><p>{error ?? statusText.savedRefreshFailed}</p><button type="button" className="mt-2 rounded-lg border p-2" onClick={actions.load}>{t.retry}</button></div> : null}
    <section aria-label={t.groups} className="grid min-w-0 gap-3 sm:grid-cols-2">
      {state.groups.map(group => <article key={group.principalGroupIdentifier} className="min-w-0 rounded-lg border border-stroke-subtle p-4">
        <h3 className="font-semibold">{group.name}</h3>
        {group.description ? <p className="break-words text-sm text-text-muted">{group.description}</p> : null}
        {group.isDefault ? <p className="text-xs text-text-muted">{t.defaultGroup}</p> : null}
        <p className="mt-2 break-all text-xs text-text-muted">{t.roles}: {group.roleIdentifiers.join(", ") || "—"}</p>
      </article>)}
    </section>
    <section aria-label={t.members} className="grid min-w-0 gap-3">
      {!state.isLoading && !state.users.length ? <p>{t.empty}</p> : null}
      {state.users.map(user => {
        const name = user.identityName.trim() || user.email || user.principalIdentifier;
        const memberships = Object.entries(state.membershipByGroup).filter(([, members]) => members.includes(user.principalIdentifier)).map(([id]) => id);
        return <article className="min-w-0 space-y-3 rounded-lg border border-stroke-subtle p-4" key={user.principalIdentifier}>
          <h3 className="break-words font-semibold">{name}</h3>
          <p className="break-all text-sm text-text-muted">{user.email}</p>
          <label className="flex flex-wrap items-center gap-3">{statusText.label}
            <select aria-label={`${name}: ${statusText.label}`} className="rounded border bg-surface-base p-2" value={user.status} disabled={!state.canManage || user.status === "forced_stop"} onChange={event => { if (event.target.value === "active" || event.target.value === "suspended") actions.updateUserStatus(user.principalIdentifier, event.target.value); }}>
              <option value="active">{statusText.active}</option><option value="suspended">{statusText.suspended}</option>
              {user.status === "forced_stop" ? <option value="forced_stop">{statusText.forced_stop}</option> : null}
            </select>
          </label>
          {user.status === "forced_stop" ? <p className="text-sm text-text-muted">{statusText.forcedReason}</p> : null}
          <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-semibold">{t.memberships}</legend>
            {state.groups.map(group => <PrincipalGroupMembershipOption key={group.principalGroupIdentifier} name={`${name}: ${group.name}`} description={group.description} checked={memberships.includes(group.principalGroupIdentifier)} disabled={!state.canManage} onChange={() => actions.updateUserGroups(user.principalIdentifier, memberships.includes(group.principalGroupIdentifier) ? memberships.filter(id => id !== group.principalGroupIdentifier) : [...memberships, group.principalGroupIdentifier])} />)}
          </fieldset>
        </article>;
      })}
    </section>
    {state.hasUnsavedChanges ? <p role="status">{t.unsaved}</p> : null}
  </section>;
}
