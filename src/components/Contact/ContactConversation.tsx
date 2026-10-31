"use client";

import type { ReactNode } from "react";

type Message = {
  id: string;
  content: string;
  date: ReactNode;
  fromSubmitter: boolean;
};

export function ContactConversation({
  initialMessage,
  replies,
  submitterName,
  operatorLabel,
  label,
  perspective,
}: {
  initialMessage: { content: string; date: ReactNode };
  replies: Message[];
  submitterName: string;
  operatorLabel: string;
  label: string;
  perspective: "submitter" | "operator";
}) {
  const messages: Message[] = [{ ...initialMessage, id: "initial", fromSubmitter: true }, ...replies];

  return (
    <ol
      aria-label={label}
      tabIndex={0}
      className="grid max-h-[min(28rem,50dvh)] gap-5 overflow-y-auto overscroll-contain rounded-lg py-2 pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
    >
      {messages.map((message) => {
        const own = message.fromSubmitter === (perspective === "submitter");
        return (
          <li className={`flex min-w-0 ${own ? "justify-end" : "justify-start"}`} key={message.id}>
            <div className="min-w-0 max-w-[90%] space-y-1.5 sm:max-w-[80%]">
              <p className={`px-1 text-xs font-semibold text-text-muted ${own ? "text-right" : "text-left"}`}>
                {message.fromSubmitter ? submitterName : operatorLabel}
              </p>
              <div className={`rounded-2xl px-4 py-3 ${own ? "rounded-tr-sm bg-brand-primary text-on-primary" : "rounded-tl-sm border border-stroke-subtle bg-surface-raised text-text-strong"}`}>
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7">{message.content}</p>
              </div>
              <p className={`px-1 text-xs text-text-muted ${own ? "text-right" : "text-left"}`}>{message.date}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
