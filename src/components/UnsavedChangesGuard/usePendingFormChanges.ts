"use client";

import { useLayoutEffect, useRef, useState } from "react";

const snapshotForm = (form: HTMLFormElement) => JSON.stringify({
  fields: Array.from(form.querySelectorAll("input, textarea, select"))
    .filter((field) => !field.hasAttribute("data-unsaved-ignore"))
    .map((field) => {
      if (field instanceof HTMLInputElement) {
        if (["button", "submit", "reset"].includes(field.type)) return null;
        if (field.type === "file") return [field.name, Array.from(field.files ?? []).map((file) => [file.name, file.size, file.lastModified])];
        if (["checkbox", "radio"].includes(field.type)) return [field.name, field.value, field.checked];
        return [field.name, field.value];
      }
      if (field instanceof HTMLSelectElement) return [field.name, Array.from(field.selectedOptions).map((option) => option.value)];
      if (field instanceof HTMLTextAreaElement) return [field.name, field.value];
      return null;
    }),
  richText: Array.from(form.querySelectorAll('[contenteditable="true"]'))
    .filter((editor) => !editor.closest("[data-unsaved-value]"))
    .map((editor) => editor.innerHTML),
  selections: Array.from(form.querySelectorAll("[data-unsaved-value]")).map((selection) => selection.getAttribute("data-unsaved-value")),
});

export function usePendingFormChanges(scope: string | null) {
  const rootRef = useRef<HTMLElement>(null);
  const [pending, setPending] = useState({ scope, changed: false });
  if (pending.scope !== scope) setPending({ scope, changed: false });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || scope === null) return;
    const baselines = new Map(Array.from(root.querySelectorAll("form")).map((form) => [form, snapshotForm(form)]));
    let active = true;
    let comparisonTimer: ReturnType<typeof setTimeout> | undefined;
    const compare = () => {
      if (!active) return;
      let changed = false;
      for (const form of root.querySelectorAll("form")) {
        const snapshot = snapshotForm(form);
        if (!baselines.has(form)) baselines.set(form, snapshot);
        else if (baselines.get(form) !== snapshot) changed = true;
      }
      setPending((previous) => previous.scope === scope && previous.changed === changed ? previous : { scope, changed });
    };
    // Let the input event finish before comparing. Updating state during capture
    // can restore a controlled field before React processes its onChange.
    const scheduleComparison = () => {
      if (comparisonTimer !== undefined) return;
      comparisonTimer = setTimeout(() => {
        comparisonTimer = undefined;
        compare();
      }, 0);
    };
    const observer = new MutationObserver(scheduleComparison);
    observer.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });
    root.addEventListener("input", scheduleComparison, true);
    root.addEventListener("change", scheduleComparison, true);
    return () => {
      active = false;
      clearTimeout(comparisonTimer);
      observer.disconnect();
      root.removeEventListener("input", scheduleComparison, true);
      root.removeEventListener("change", scheduleComparison, true);
    };
  }, [scope]);

  return { rootRef, hasPendingChanges: pending.scope === scope && scope !== null && pending.changed };
}
