"use client";
import { TrashIcon } from "@radix-ui/react-icons";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { deleteWikiVideo, type WikiVideo } from "@/gateways/wiki/wikiVideos";
import { useI18n } from "@/i18n/I18nProvider";
import { getFocusableElements } from "../WikiImageLibrary/focus";

export function WikiVideoDeleteButton({
  video,
  onDeleted,
  restricted = false,
}: {
  video: WikiVideo;
  restricted?: boolean;
  onDeleted: () => void;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.deletion;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={`${t.label}: ${video.title}`}
        disabled={restricted}
        title={restricted ? dictionary.wiki.videos.watchRequests.deleteRestricted : undefined}
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-status-danger hover:bg-status-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <TrashIcon aria-hidden="true" className="h-4 w-4" />
      </button>
      {open ? (
        <DeleteDialog
          video={video}
          onDeleted={onDeleted}
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}

function DeleteDialog({
  video,
  onClose,
  onDeleted,
}: {
  video: WikiVideo;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.deletion;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"failed" | "restricted" | null>(null);
  const inFlight = useRef(false);
  const active = useRef(true);
  const panel = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    active.current = true;
    cancel.current?.focus();
    return () => {
      active.current = false;
    };
  }, []);
  const close = () => {
    if (!inFlight.current) onClose();
  };
  const handleKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
    if (event.key !== "Tab" || !panel.current) return;
    const elements = getFocusableElements(panel.current);
    const first = elements[0],
      last = elements.at(-1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const submit = () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    void deleteWikiVideo(video.videoLinkIdentifier).then((result) => {
      // A committed deletion invalidates the public cache even if the user logged out meanwhile.
      if (result.ok) onDeleted();
      if (!active.current) return;
      inFlight.current = false;
      setPending(false);
      if (result.ok) onClose();
      else setError(result.status === 409 ? "restricted" : "failed");
    });
  };
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label={t.confirm}
      onKeyDown={handleKey}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4"
    >
      <div
        ref={panel}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-stroke-subtle bg-surface-raised p-5 text-text-strong shadow-soft"
        aria-busy={pending}
      >
        <h2 className="text-lg font-semibold">{t.confirm}</h2>
        <p className="my-4 break-words">{video.title}</p>
        {error ? (
          <p role="alert" className="mb-4 text-status-danger">
            {error === "restricted" ? dictionary.wiki.videos.watchRequests.deleteRestricted : t.failed}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            ref={cancel}
            type="button"
            disabled={pending}
            onClick={close}
            className="min-h-11 rounded-lg border border-stroke-subtle px-4"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="min-h-11 rounded-lg bg-status-danger px-4 text-white disabled:opacity-50"
          >
            {pending ? t.deleting : t.submit}
          </button>
        </div>
      </div>
    </section>
  );
}
