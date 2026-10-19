"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import {
  announcementRequest,
  announcementSchemas as schemas,
  type AnnouncementInput,
  type DraftAnnouncement,
} from "@/gateways/site-management/announcements";
import { canUseAnnouncements } from "@/gateways/site-management/siteManagementPolicy";
import { useAuthStore } from "@/gateways/auth/authStore";
import { dictionaries } from "@/i18n/dictionaries";
import { useAdmin } from "../../AdminProvider";
import { adminQueryKeys } from "../../queryKeys";
import {
  AnnouncementEditor,
  type AnnouncementAction,
} from "./AnnouncementEditor";
const statusOf = (error: unknown) =>
  error && typeof error === "object" && "status" in error ? error.status : null;

export function SiteManagementAnnouncementsClient() {
  const { currentIdentity: identity } = useAdmin();
  const version = useAuthStore((state) => state.sessionVersion);
  const scope = JSON.stringify([
    identity.accountIdentifier,
    identity.identityIdentifier,
    identity.siteManagementPrincipalIdentifier,
    identity.delegationIdentifier,
    identity.siteManagementPolicies,
    version,
  ]);
  return <ScopedAnnouncements key={scope} scope={scope} />;
}
function ScopedAnnouncements({ scope }: { scope: string }) {
  const { currentIdentity: identity, locale, refreshIdentity } = useAdmin();
  const t = dictionaries[locale].announcements;
  const router = useRouter();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{
    draft: DraftAnnouncement | null;
    revision: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(false);
  const running = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const allowed = (
    action:
      | "view-draft"
      | "create"
      | "update"
      | "translate"
      | "publish"
      | "delete",
  ) => !denied && canUseAnnouncements(identity, action);
  const key = adminQueryKeys.siteManagement.announcements(scope);
  const query = useQuery({
    queryKey: [...key, page],
    queryFn: () =>
      announcementRequest(
        `draft-announcements?page=${page}`,
        schemas.ListDraftAnnouncementsPage,
      ),
    enabled: allowed("view-draft"),
    retry: false,
  });
  const accessError = statusOf(query.error);
  useEffect(() => {
    if (accessError !== 401 && accessError !== 403) return;
    void refreshIdentity({ preserveOnNull: true });
    if (accessError === 401)
      router.replace(
        "/login?returnTo=%2Fadmin%2Fsite-management%2Fannouncements",
      );
  }, [accessError, refreshIdentity, router]);
  const handleError = (failure: unknown) => {
    if (!alive.current) return;
    setError(statusOf(failure) === 404 ? t.notFound : t.failed);
    if (statusOf(failure) === 401 || statusOf(failure) === 403) {
      setDenied(true);
      setEditor(null);
      client.removeQueries({ queryKey: key });
      void refreshIdentity({ preserveOnNull: true });
      if (statusOf(failure) === 401)
        router.replace(
          "/login?returnTo=%2Fadmin%2Fsite-management%2Fannouncements",
        );
    }
  };
  const open = (id: string) => {
    if (running.current || !allowed("view-draft")) return;
    running.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    void announcementRequest(
      `draft-announcements/${id}`,
      schemas.DraftAnnouncement,
    )
      .then((draft) => {
        if (alive.current) setEditor({ draft, revision: 0 });
      }, handleError)
      .finally(() => {
        running.current = false;
        if (alive.current) setBusy(false);
      });
  };
  const act = (
    action: AnnouncementAction,
    inputs: AnnouncementInput[] = [],
  ) => {
    const draft = editor?.draft;
    if (
      running.current ||
      !editor ||
      !allowed(action === "save" ? (draft ? "update" : "create") : action)
    )
      return;
    running.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    const execute = async () => {
      if (action === "save") {
        let saved = draft;
        for (const input of inputs) {
          if (!alive.current) return;
          saved = await announcementRequest(
            draft
              ? `draft-announcements/${draft.announcementIdentifier}`
              : "draft-announcements",
            schemas.DraftAnnouncement,
            draft ? "PUT" : "POST",
            input,
          );
        }
        if (alive.current && saved) {
          setEditor({ draft: saved, revision: editor.revision + 1 });
          setMessage(t.saved);
        }
      } else if (draft) {
        const path = `draft-announcements/${draft.announcementIdentifier}`;
        if (action === "translate") {
          const result = await announcementRequest(
            `${path}/translate`,
            schemas.TranslateAnnouncementResponse,
            "POST",
          );
          if (alive.current) {
            setEditor({
              draft: result.announcements[0],
              revision: editor.revision + 1,
            });
            setMessage(t.translated);
          }
        } else {
          if (action === "delete")
            await announcementRequest(
              path,
              schemas.DeleteAnnouncementResponse,
              "DELETE",
            );
          else
            await announcementRequest(
              `${path}/publish`,
              schemas.PublishAnnouncementResponse,
              "POST",
            );
          if (alive.current) {
            setEditor(null);
            setMessage(action === "delete" ? t.deleted : t.published);
            setPage(1);
          }
        }
      }
      if (alive.current) await client.invalidateQueries({ queryKey: key });
    };
    void execute()
      .catch(handleError)
      .finally(() => {
        running.current = false;
        if (alive.current) setBusy(false);
      });
  };
  if (!allowed("view-draft") || accessError === 401 || accessError === 403)
    return (
      <AccountStatusMessage variant="error">{t.denied}</AccountStatusMessage>
    );
  const feedback = (
    <div className="min-h-14 space-y-2">
      {error ? (
        <AccountStatusMessage variant="error">{error}</AccountStatusMessage>
      ) : null}
      {message ? (
        <AccountStatusMessage variant="success">{message}</AccountStatusMessage>
      ) : null}
    </div>
  );
  return (
    <AccountSettingsPanel
      title={t.management}
      action={
        !editor && allowed("create") ? (
          <button
            className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            type="button"
            onClick={() => {
              setEditor({ draft: null, revision: 0 });
              setMessage(null);
            }}
          >
            {t.create}
          </button>
        ) : null
      }
    >
      <div className="mt-5 space-y-4">
        {editor ? (
          <AnnouncementEditor
            key={`${editor.draft?.announcementIdentifier ?? "new"}:${editor.revision}`}
            draft={editor.draft}
            locale={locale}
            allowed={allowed}
            busy={busy}
            feedback={feedback}
            onAction={act}
            onClose={() => {
              setEditor(null);
              setMessage(null);
              setError(null);
            }}
            t={t}
          />
        ) : (
          <>
            {query.isPending || busy ? (
              <p role="status" className="text-sm text-text-muted">{t.loading}</p>
            ) : null}
            {query.isError ? (
              <AccountStatusMessage
                variant="error"
                action={
                  <button
                    className="mt-2 underline underline-offset-4"
                    type="button"
                    onClick={() => void query.refetch()}
                  >
                    {t.retry}
                  </button>
                }
              >
                {t.failed}
              </AccountStatusMessage>
            ) : null}
            {!query.isError && query.data ? (
              <>
                <ul className="divide-y divide-stroke-subtle">
                  {query.data.announcements.map((draft) => (
                    <li key={draft.announcementIdentifier} className="space-y-2 py-4">
                      <button
                        disabled={busy}
                        className="text-start font-semibold text-text-strong underline underline-offset-4 break-words disabled:opacity-60"
                        onClick={() => open(draft.announcementIdentifier)}
                      >
                        {draft.contents[locale]?.title ??
                          draft.contents[draft.sourceLanguage]?.title}
                      </button>
                    </li>
                  ))}
                </ul>
                {query.data.announcements.length === 0 ? (
                  <AccountStatusMessage variant="empty">{t.draftEmpty}</AccountStatusMessage>
                ) : null}
                <nav
                  aria-label={t.management}
                  className="flex flex-wrap items-center justify-end gap-4 border-t border-stroke-subtle pt-4 text-sm [&_button]:rounded-lg [&_button]:border [&_button]:border-stroke-subtle [&_button]:px-4 [&_button]:py-2 [&_button]:font-semibold [&_button]:transition [&_button:hover]:bg-surface-base [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-40"
                >
                  <button
                    disabled={busy || query.isFetching || page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    {t.previous}
                  </button>
                  <span>
                    {page} / {query.data.last_page}
                  </span>
                  <button
                    disabled={
                      busy || query.isFetching || page >= query.data.last_page
                    }
                    onClick={() => setPage(page + 1)}
                  >
                    {t.next}
                  </button>
                </nav>
              </>
            ) : null}
            {feedback}
          </>
        )}
      </div>
    </AccountSettingsPanel>
  );
}
