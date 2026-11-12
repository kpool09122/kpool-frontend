"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { getWikiContentEditorId, isWikiSection, type WikiContentEditorId, type WikiContentMove, type WikiSectionContent } from "@kpool/wiki";
import { GripVertical } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type WikiReorderItem = {
  attributes: {
    "data-wiki-reorder-id": WikiContentEditorId;
    "data-wiki-dragging"?: true;
    "data-wiki-drop"?: "before" | "after";
  };
  handle: ReactNode;
};

export const wikiReorderItemClassName = "data-[wiki-dragging]:opacity-50 data-[wiki-drop]:after:pointer-events-none data-[wiki-drop]:after:absolute data-[wiki-drop]:after:inset-x-0 data-[wiki-drop]:after:z-10 data-[wiki-drop]:after:h-0.5 data-[wiki-drop]:after:bg-brand-primary data-[wiki-drop=before]:after:top-0 data-[wiki-drop=after]:after:bottom-0";

type Drag = {
  pointerId: number;
  handle: HTMLButtonElement;
  startY: number;
  y: number;
  targets: { id: WikiContentEditorId; element: HTMLElement }[];
  active: boolean;
};

const getTarget = ({ y, targets }: Drag) =>
  (targets.find(({ element }) => y <= element.getBoundingClientRect().bottom)
    ?? targets.at(-1))?.id;

export function WikiReorderList<T extends WikiSectionContent>({
  items,
  parentSectionIdentifier,
  onMove,
  renderItem,
}: {
  items: T[];
  parentSectionIdentifier?: string;
  onMove?: (move: WikiContentMove) => void;
  renderItem: (item: T, reorder?: WikiReorderItem) => ReactNode;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.ui;
  const drag = useRef<Drag | null>(null);
  const scrollFrame = useRef(0);
  const refocus = useRef<HTMLButtonElement | null>(null);
  const [preview, setPreview] = useState<{ source: WikiContentEditorId; target: WikiContentEditorId } | null>(null);
  const sectionIds = items.filter(isWikiSection).map(getWikiContentEditorId);
  const blockIds = items.filter((item) => !isWikiSection(item)).map(getWikiContentEditorId);

  useLayoutEffect(() => {
    refocus.current?.focus({ preventScroll: true });
    refocus.current = null;
  }, [items]);

  const stopDrag = () => {
    const current = drag.current;
    drag.current = null;
    cancelAnimationFrame(scrollFrame.current);
    if (current?.handle.hasPointerCapture(current.pointerId)) {
      current.handle.releasePointerCapture(current.pointerId);
    }
    setPreview(null);
  };

  const showTarget = (source: WikiContentEditorId, current: Drag) => {
    const target = getTarget(current);
    if (target) {
      setPreview((previous) => previous?.source === source && previous.target === target ? previous : { source, target });
    }
  };

  const scrollWhileDragging = (source: WikiContentEditorId) => {
    const current = drag.current;
    if (!current?.active || !current.handle.isConnected) return;
    const edge = 64;
    const distance = Math.max(0, edge - current.y) - Math.max(0, edge - (window.innerHeight - current.y));
    if (distance !== 0) {
      window.scrollBy(0, -Math.sign(distance) * Math.min(20, Math.ceil(Math.abs(distance) / 3)));
      showTarget(source, current);
    }
    scrollFrame.current = requestAnimationFrame(() => scrollWhileDragging(source));
  };

  return items.map((item) => {
    const id = getWikiContentEditorId(item);
    const ids = isWikiSection(item) ? sectionIds : blockIds;
    if (!onMove || ids.length < 2) return renderItem(item);

    const index = ids.indexOf(id);
    const sourceIndex = preview ? ids.indexOf(preview.source) : -1;
    const label = isWikiSection(item) ? item.title : dictionary.wiki.blockTypes[item.blockType];

    return renderItem(item, {
      attributes: {
        "data-wiki-reorder-id": id,
        "data-wiki-dragging": preview?.source === id ? true : undefined,
        "data-wiki-drop": preview?.target === id && sourceIndex !== index
          ? sourceIndex < index ? "after" : "before"
          : undefined,
      },
      handle: (
        <button
          aria-keyshortcuts="ArrowUp ArrowDown"
          aria-label={`${t.reorderContent}: ${label}`}
          className="flex size-11 shrink-0 touch-none select-none items-center justify-center rounded-lg text-text-muted hover:bg-text-strong/5 hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-muted cursor-grab active:cursor-grabbing"
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key === "Escape" && drag.current) {
              event.preventDefault();
              stopDrag();
              return;
            }
            if (drag.current || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
            event.preventDefault();
            const target = ids[index + (event.key === "ArrowUp" ? -1 : 1)];
            if (target) {
              refocus.current = event.currentTarget;
              onMove({ parentSectionIdentifier, source: id, target });
            }
          }}
          onPointerDown={(event) => {
            if (event.button !== 0 || !event.isPrimary || drag.current) return;
            const handle = event.currentTarget;
            const siblings = handle.closest("[data-wiki-reorder-id]")?.parentElement?.children;
            if (!siblings) return;
            const targets = Array.from(siblings).flatMap((element) => {
              if (!(element instanceof HTMLElement)) return [];
              const targetId = element.dataset.wikiReorderId as WikiContentEditorId | undefined;
              return targetId && ids.includes(targetId) ? [{ id: targetId, element }] : [];
            });
            drag.current = { pointerId: event.pointerId, handle, startY: event.clientY, y: event.clientY, targets, active: false };
            handle.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const current = drag.current;
            if (!current || current.pointerId !== event.pointerId) return;
            current.y = event.clientY;
            if (!current.active && Math.abs(current.y - current.startY) >= 5) {
              current.active = true;
              scrollWhileDragging(id);
            }
            if (current.active) showTarget(id, current);
          }}
          onPointerUp={(event) => {
            const current = drag.current;
            if (!current || current.pointerId !== event.pointerId) return;
            current.y = event.clientY;
            const target = current.active ? getTarget(current) : undefined;
            stopDrag();
            if (target && target !== id) onMove({ parentSectionIdentifier, source: id, target });
          }}
          onPointerCancel={(event) => {
            if (drag.current?.pointerId === event.pointerId) stopDrag();
          }}
          onLostPointerCapture={(event) => {
            if (drag.current?.pointerId === event.pointerId) stopDrag();
          }}
          title={t.reorderContent}
          type="button"
        >
          <GripVertical aria-hidden="true" size={19} />
        </button>
      ),
    });
  });
}
