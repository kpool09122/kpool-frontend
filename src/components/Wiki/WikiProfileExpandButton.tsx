"use client";

import { Cross2Icon, EnterFullScreenIcon } from "@radix-ui/react-icons";
import type { WikiBasic } from "@kpool/wiki";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { useI18n } from "../../i18n/I18nProvider";
import { WikiBasicFieldsList } from "./WikiBasicFieldsList";
import { cardSurfaceStyle } from "./styles";

type WikiProfileExpandButtonProps = {
  basic: WikiBasic;
  language: string;
  title: string;
};

export function WikiProfileExpandButton({ basic, language, title }: WikiProfileExpandButtonProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.heroCard;
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          aria-label={t.expandProfile}
          title={t.expandProfile}
          className="rounded-full p-2 text-text-strong transition hover:bg-brand-highlight/30 focus-visible:outline-2 focus-visible:outline-brand-primary"
          onClick={(event) => {
            event.stopPropagation();
            // Keep Wiki theme variables while escaping the transformed flip card.
            setPortalContainer(event.currentTarget.closest<HTMLElement>(".wiki-theme-scope") ?? document.body);
          }}
          type="button"
        >
          <EnterFullScreenIcon aria-hidden="true" className="h-5 w-5" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal container={portalContainer}>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/55"
          onClick={(event) => event.stopPropagation()}
        />
        <Dialog.Content
          aria-describedby={undefined}
          className="@container/wiki-profile fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-stroke-subtle bg-surface-raised text-text-strong shadow-soft"
          onClick={(event) => event.stopPropagation()}
          style={cardSurfaceStyle}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stroke-subtle p-5 sm:px-8">
            <Dialog.Title className="wiki-title min-w-0 break-words text-xl font-semibold sm:text-2xl">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label={t.closeProfile}
                title={t.closeProfile}
                className="shrink-0 rounded-full p-2 transition hover:bg-brand-highlight/30 focus-visible:outline-2 focus-visible:outline-brand-primary"
                type="button"
              >
                <Cross2Icon aria-hidden="true" className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:px-8">
            <WikiBasicFieldsList
              basic={basic}
              className="grid @min-[28rem]/wiki-profile:grid-cols-2 @min-[28rem]/wiki-profile:gap-x-8"
              itemClassName="border-b border-stroke-subtle py-3"
              language={language}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
