"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { buildWikiPath } from "@kpool/wiki";
import { usePublicWikiSearch } from "@/gateways/wiki/usePublicWikiSearch";
import { headerWikiSearchCopy } from "@/i18n/headerWikiSearch";
import type { Locale } from "@/i18n/locales";

export function HeaderWikiSearch({ language, active = true, onClose }: { language: Locale; active?: boolean; onClose?: () => void }) {
  const t = headerWikiSearchCopy[language];
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const keyword = input.trim();
  const showResults = active && isOpen && Boolean(keyword) && !isComposing;
  const search = usePublicWikiSearch(language, keyword, showResults);
  const items = search.data ?? [];

  return (
    <div
      ref={root}
      className="relative min-w-0 flex-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
    >
      <div className="relative">
        <MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-5 text-text-muted" />
        <input
          aria-label={t.label}
          aria-autocomplete="list"
          aria-controls={showResults ? id : undefined}
          aria-expanded={showResults}
          aria-activedescendant={showResults && items[activeIndex] ? `${id}-${activeIndex}` : undefined}
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-stroke-subtle bg-surface-base pl-10 pr-3 text-base text-text-strong outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          data-unsaved-ignore
          placeholder={t.label}
          role="combobox"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setActiveIndex(-1);
            setIsOpen(true);
          }}
          onCompositionStart={() => { setIsComposing(true); setActiveIndex(-1); }}
          onCompositionEnd={() => setIsComposing(false)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (isComposing || event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === "Escape") { setIsOpen(false); setActiveIndex(-1); onClose?.(); }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
              const nextIndex = !items.length ? -1 : activeIndex < 0
                ? event.key === "ArrowDown" ? 0 : items.length - 1
                : (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
              setActiveIndex(nextIndex);
              root.current?.querySelector<HTMLAnchorElement>(`[id="${id}-${nextIndex}"]`)?.scrollIntoView?.({ block: "nearest" });
            }
            if (event.key === "Enter" && showResults && items[activeIndex]) {
              event.preventDefault();
              root.current?.querySelector<HTMLAnchorElement>(`[id="${id}-${activeIndex}"]`)?.click();
            }
          }}
        />
      </div>
      {showResults ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[60dvh] overflow-auto rounded-lg border border-stroke-subtle bg-surface-raised p-2 shadow-soft">
          <ul id={id} role="listbox" aria-label={t.results}>
            {items.map((item, index) => (
              <li key={item.wikiIdentifier} role="presentation">
                <Link
                  id={`${id}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  href={buildWikiPath(item.language || language, item.slug)}
                  prefetch={false}
                  className={`block break-words rounded px-3 py-2 text-sm text-text-strong hover:bg-brand-highlight/30 focus-visible:outline-2 focus-visible:outline-brand-primary ${index === activeIndex ? "bg-brand-highlight/30" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => { setIsOpen(false); setActiveIndex(-1); }}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
          {!search.isSuccess || items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-text-muted" role="status">
              {search.isError ? t.error : search.isPending ? t.loading : t.empty}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
