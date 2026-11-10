"use client";

import { useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchAllTranslationSetMasterSearch } from "@/gateways/wiki/translationSetMasterSearchBrowserApi";

export function AnalyzeWikiSelect({ label, disabled, initialSelection }: {
  label: string;
  disabled: boolean;
  initialSelection?: { translationSetIdentifier: string; name: string };
}) {
  const { locale, dictionary } = useI18n();
  const t = dictionary.wiki.ui;
  const inputId = useId();
  const listId = `${inputId}-results`;
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [keyword, setKeyword] = useState(initialSelection?.name ?? "");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(initialSelection ?? null);
  const results = useQuery({
    queryKey: ["admin", "analyze", "wiki-search", locale, searchKeyword],
    queryFn: ({ signal }) => fetchAllTranslationSetMasterSearch({ keyword: searchKeyword, locale, fallbackErrorMessage: t.searchFailed, signal }),
    enabled: !!searchKeyword,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const visible = open && !!searchKeyword && !disabled;
  const search = () => {
    const next = keyword.trim();
    if (!next || disabled || (results.isFetching && searchKeyword === next)) return;
    setOpen(true);
    if (searchKeyword === next) void results.refetch();
    else setSearchKeyword(next);
  };
  const clear = () => {
    setSelected(null);
    setKeyword("");
    setSearchKeyword("");
    setOpen(false);
    input.current?.focus({ preventScroll: true });
  };
  return (
    <div className="relative col-span-2 min-w-0 md:col-span-1"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          input.current?.focus({ preventScroll: true });
          setOpen(false);
        }
      }}>
      <label htmlFor={inputId} className="block text-xs">{label}</label>
      <div className="mt-1 flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <input ref={input} id={inputId} role="combobox" aria-autocomplete="list" aria-expanded={visible} aria-controls={visible && results.data?.translationSetMasters.length ? listId : undefined}
            autoComplete="off" className="h-9 w-full min-w-0 rounded border border-stroke-subtle bg-surface-base py-1.5 pl-2 pr-8 text-sm"
            placeholder={t.searchPlaceholder} value={keyword} disabled={disabled}
            onChange={(event) => { setKeyword(event.currentTarget.value); setSelected(null); setSearchKeyword(""); setOpen(false); }}
            onFocus={() => { if (searchKeyword) setOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); search(); }
              if (event.key === "ArrowDown" && visible) {
                event.preventDefault();
                list.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
              }
            }} />
          {selected ? <button type="button" disabled={disabled} onClick={clear} aria-label={`${t.remove}: ${selected.name}`}
            className="absolute inset-y-0 right-0 w-8 rounded text-text-muted hover:text-brand-primary">×</button> : null}
        </div>
        <button type="button" className="h-9 shrink-0 rounded border border-stroke-subtle px-2.5 text-sm disabled:opacity-50"
          disabled={disabled || !keyword.trim()} aria-busy={results.isFetching} onClick={search}>{t.search}</button>
      </div>
      <input type="hidden" name="target" value={selected?.translationSetIdentifier ?? ""} />
      <input type="hidden" name="wikiName" value={selected?.name ?? ""} />
      {visible ? <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-lg border border-stroke-subtle bg-surface-base p-1 shadow-lg">
        {results.isFetching ? <p role="status" className="px-2 py-2 text-xs text-text-muted">{t.searchLoading}</p> : null}
        {results.isError ? <p role="alert" className="px-2 py-2 text-sm text-status-danger">{t.searchFailed}</p> : null}
        {results.data?.translationSetMasters.length ? (
          <ul ref={list} id={listId} role="listbox" aria-label={label}>
            {results.data.translationSetMasters.map((item, index) => <li key={item.translationSetIdentifier} role="presentation">
              <button type="button" role="option" aria-selected={selected?.translationSetIdentifier === item.translationSetIdentifier} disabled={disabled}
                className="flex w-full min-w-0 items-baseline gap-2 rounded px-2 py-2 text-left text-sm hover:bg-brand-highlight/30 focus:bg-brand-highlight/30 focus:outline-none"
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                  event.preventDefault();
                  const options = list.current?.querySelectorAll<HTMLButtonElement>("button");
                  if (options?.length) options[(index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length].focus({ preventScroll: true });
                }}
                onClick={() => { setSelected({ translationSetIdentifier: item.translationSetIdentifier, name: item.displayWiki.name }); setKeyword(item.displayWiki.name); setSearchKeyword(""); setOpen(false); input.current?.focus({ preventScroll: true }); }}>
                <span className="min-w-0 truncate">{item.displayWiki.name}</span>{" "}
                <span className="min-w-0 truncate text-xs text-text-muted">{item.displayWiki.slug}</span>
              </button>
            </li>)}
          </ul>
        ) : !results.isFetching && results.isSuccess ? <p role="status" className="px-2 py-2 text-sm text-text-muted">{t.searchEmpty}</p> : null}
      </div> : null}
    </div>
  );
}
