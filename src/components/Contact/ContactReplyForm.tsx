"use client";

import { PaperPlaneIcon, ReloadIcon } from "@radix-ui/react-icons";
import type { ReactNode } from "react";

export function ContactReplyForm({ content, onChange, onSubmit, pending, labels, feedback }: {
  content: string;
  onChange: (content: string) => void;
  onSubmit: () => void;
  pending: boolean;
  labels: { replyContent: string; reply: string; replying: string };
  feedback?: ReactNode;
}) {
  return (
    <form className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-stroke-subtle pt-4" onSubmit={(event) => {
      event.preventDefault();
      if (!pending && content.trim()) onSubmit();
    }}>
      <label className="grid min-w-0 gap-2">
        <span className="sr-only">{labels.replyContent}</span>
        <textarea
          className="min-h-24 w-full resize-y rounded-2xl border border-stroke-subtle bg-surface-raised px-4 py-3 text-sm leading-6 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:opacity-60"
          placeholder={labels.replyContent}
          disabled={pending}
          onChange={(event) => onChange(event.currentTarget.value)}
          required
          value={content}
        />
      </label>
      <button
        aria-label={pending ? labels.replying : labels.reply}
        aria-busy={pending}
        title={pending ? labels.replying : labels.reply}
        className="grid size-11 place-items-center justify-self-end rounded-full bg-brand-primary text-on-primary transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:opacity-60"
        disabled={pending || !content.trim()}
        type="submit"
      >
        {pending ? <ReloadIcon aria-hidden="true" className="size-5 animate-spin" /> : <PaperPlaneIcon aria-hidden="true" className="size-5" />}
      </button>
      {feedback ? <div className="col-span-2">{feedback}</div> : null}
    </form>
  );
}
