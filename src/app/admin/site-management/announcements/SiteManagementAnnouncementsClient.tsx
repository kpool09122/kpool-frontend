"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
    return <p role="alert">{t.denied}</p>;
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">{t.management}</h1>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {editor ? (
        <AnnouncementEditor
          key={`${editor.draft?.announcementIdentifier ?? "new"}:${editor.revision}`}
          draft={editor.draft}
          allowed={allowed}
          busy={busy}
          onAction={act}
          onClose={() => setEditor(null)}
          t={t}
        />
      ) : (
        <>
          {allowed("create") ? (
            <button
              className="rounded border px-4 py-2"
              disabled={busy}
              onClick={() => {
                setEditor({ draft: null, revision: 0 });
                setMessage(null);
              }}
            >
              {t.create}
            </button>
          ) : null}
          {query.isPending || busy ? <p role="status">{t.loading}</p> : null}
          {query.isError ? (
            <div role="alert">
              {t.failed}
              <button onClick={() => void query.refetch()}>{t.retry}</button>
            </div>
          ) : null}
          {!query.isError && query.data ? (
            <>
              <ul className="divide-y divide-stroke-subtle">
                {query.data.announcements.map((draft) => (
                  <li key={draft.announcementIdentifier} className="py-3">
                    <button
                      disabled={busy}
                      className="text-start underline break-words"
                      onClick={() => open(draft.announcementIdentifier)}
                    >
                      {draft.contents[locale]?.title ??
                        draft.contents[draft.sourceLanguage]?.title}
                    </button>
                    <p>{draft.publishedDate}</p>
                  </li>
                ))}
              </ul>
              {query.data.announcements.length === 0 ? <p>{t.empty}</p> : null}
              <nav className="flex gap-4">
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
        </>
      )}
    </section>
  );
}
