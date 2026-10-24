"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

export function ContactDialog({ children, title, savedName, closeLabel, actions, closeDisabled = false, viewKey, fallbackFocusRef, onClose }: {
  children: ReactNode;
  title: string;
  savedName?: string;
  closeLabel: string;
  actions?: ReactNode;
  closeDisabled?: boolean;
  viewKey: string;
  fallbackFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef(false);
  const closeRequestedRef = useRef(false);
  const requestClose = () => {
    if (closeDisabled || closeRequestedRef.current) return;
    closeRequestedRef.current = true;
    onClose();
  };
  useLayoutEffect(() => {
    const dialog = ref.current;
    activeRef.current = true;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { scrollX, scrollY } = window;
    // Lock only while this dialog is mounted; retain inline values and priorities.
    const styles = [
      { style: document.documentElement.style, values: { "overflow-x": "hidden", "overflow-y": "hidden" } },
      { style: document.body.style, values: { position: "fixed", top: `${-scrollY}px`, left: `${-scrollX}px`, width: "100%", "overflow-x": "hidden", "overflow-y": "hidden" } },
    ];
    const restoreStyles = styles.map(({ style, values }) => {
      const previous = Object.keys(values).map((property) => ({ property, value: style.getPropertyValue(property), priority: style.getPropertyPriority(property) }));
      Object.entries(values).forEach(([property, value]) => style.setProperty(property, value));
      return () => previous.forEach(({ property, value, priority }) => {
        if (value) style.setProperty(property, value, priority);
        else style.removeProperty(property);
      });
    });
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    return () => {
      activeRef.current = false;
      dialog?.close?.();
      restoreStyles.forEach((restore) => restore());
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
    };
  }, [fallbackFocusRef]);
  useEffect(() => {
    const opener = openerRef.current;
    const fallbackFocus = fallbackFocusRef.current;
    // Restore after DOM removal, so filtering out the opener uses the fallback.
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      else if (fallbackFocus?.isConnected) fallbackFocus.focus({ preventScroll: true });
    };
  }, [fallbackFocusRef]);
  useLayoutEffect(() => { ref.current?.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true }); }, [viewKey]);
  return <dialog ref={ref} aria-label={title} aria-modal="true"
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-xl bg-surface-raised text-text-strong backdrop:bg-black/40"
    onCancel={(event) => { event.preventDefault(); requestClose(); }}
    onClose={(event) => {
      const dialog = event.currentTarget;
      // Ignore queued cleanup events after unmount or StrictMode reopening.
      if (!activeRef.current || !dialog.isConnected || dialog.open || closeRequestedRef.current) return;
      if (closeDisabled) {
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
      } else requestClose();
    }}>
    <section className="grid w-full gap-5 p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-xl font-bold text-text-strong outline-none" tabIndex={-1}>{title}</h3>
          {savedName !== undefined ? <p className="break-words text-sm text-text-muted">{savedName}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-lg border border-stroke-subtle px-3 py-2 text-sm disabled:opacity-60" disabled={closeDisabled} onClick={requestClose} type="button">{closeLabel}</button>
          {actions}
        </div>
      </div>
      {children}
    </section>
  </dialog>;
}
