"use client";

import { type KeyboardEvent, useMemo, useState } from "react";
import type { WikiResourceType } from "@kpool/wiki";

import {
  fetchWikiMasterSearch,
  type WikiMasterSearchItem,
} from "@/gateways/wiki/wikiMasterSearchBrowserApi";

type WikiMasterSearchSelectProps = {
  disabled?: boolean;
  language: string;
  label: string;
  mode?: "single" | "multiple";
  name?: string;
  onChange: (items: WikiMasterSearchItem[]) => void;
  placeholder?: string;
  resourceType: WikiResourceType;
  selectedItems: WikiMasterSearchItem[];
  showSelectedItems?: boolean;
};

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; items: WikiMasterSearchItem[] }
  | { status: "error"; message: string };

const chipClassName =
  "inline-flex max-w-full items-center gap-1.5 rounded-full border border-stroke-subtle bg-surface-raised px-2.5 py-1 text-xs font-semibold text-text-strong";

export function WikiMasterSearchSelect({
  disabled = false,
  language,
  label,
  mode = "single",
  name,
  onChange,
  placeholder = "Wiki名で検索",
  resourceType,
  selectedItems,
  showSelectedItems = true,
}: WikiMasterSearchSelectProps) {
  const [keyword, setKeyword] = useState(selectedItems[0]?.name ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
  const selectedIds = useMemo(
    () => new Set(selectedItems.map((item) => item.wikiIdentifier)),
    [selectedItems],
  );

  const search = () => {
    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
      setIsOpen(true);
      setSearchState({ status: "error", message: "検索キーワードを入力してください" });
      return;
    }

    setIsOpen(true);
    setSearchState({ status: "loading" });

    void fetchWikiMasterSearch({
      fallbackErrorMessage: "Wiki候補の検索に失敗しました",
      keyword: trimmedKeyword,
      language,
      resourceType,
    }).then((response) => {
      setSearchState({ status: "success", items: response.wikis });
    }).catch((error: unknown) => {
      console.error("Failed to search wiki masters", error);
      setSearchState({
        status: "error",
        message: error instanceof Error ? error.message : "Wiki候補の検索に失敗しました",
      });
    });
  };

  const selectItem = (item: WikiMasterSearchItem) => {
    if (mode === "single") {
      onChange([item]);
      setKeyword(item.name);
      setIsOpen(false);
      return;
    }

    if (selectedIds.has(item.wikiIdentifier)) {
      return;
    }

    onChange([...selectedItems, item]);
    setKeyword("");
    setIsOpen(false);
  };

  const removeItem = (wikiIdentifier: string) => {
    onChange(selectedItems.filter((item) => item.wikiIdentifier !== wikiIdentifier));
  };

  const hiddenValue = mode === "single"
    ? selectedItems[0]?.wikiIdentifier ?? ""
    : selectedItems.map((item) => item.wikiIdentifier).join(",");

  return (
    <div className="grid min-w-0 self-start gap-2 text-sm font-semibold text-text-strong">
      <label className="grid min-w-0 gap-2">
        {label}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-1.5">
          <input
            aria-label={`${label} keyword`}
            className="h-9 min-w-0 rounded-lg border border-stroke-subtle bg-surface-raised px-2.5 text-sm"
            disabled={disabled || searchState.status === "loading"}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setKeyword(nextValue);
              if (mode === "single" && nextValue.trim() === "") {
                onChange([]);
              }
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter") {
                event.preventDefault();
                search();
              }
            }}
            placeholder={placeholder}
            value={keyword}
          />
          <button
            className="h-9 w-14 shrink-0 whitespace-nowrap rounded-lg border border-stroke-subtle px-2 text-xs font-semibold text-text-strong disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled || searchState.status === "loading"}
            onClick={search}
            type="button"
          >
            {searchState.status === "loading" ? "検索中" : "検索"}
          </button>
        </div>
      </label>
      {name ? <input name={name} type="hidden" value={hiddenValue} /> : null}
      {showSelectedItems && selectedItems.length > 0 ? (
        <div className="flex min-w-0 max-w-full flex-wrap gap-1.5" aria-label={`${label} selected`}>
          {selectedItems.map((item) => (
            <span className={chipClassName} key={item.wikiIdentifier}>
              <span className="min-w-0 truncate">{item.name}</span>
              <button
                aria-label={`${item.name} を削除`}
                className="shrink-0 text-text-muted hover:text-status-danger"
                disabled={disabled}
                onClick={() => removeItem(item.wikiIdentifier)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {isOpen && searchState.status === "loading" ? (
        <p className="min-w-0 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-3 text-sm text-text-muted">
          Wiki候補を検索しています
        </p>
      ) : null}
      {isOpen && searchState.status === "error" ? (
        <p className="min-w-0 rounded-xl border border-status-danger/40 bg-surface-base px-3 py-3 text-sm font-semibold text-status-danger" role="alert">
          {searchState.message}
        </p>
      ) : null}
      {isOpen && searchState.status === "success" && searchState.items.length === 0 ? (
        <p className="min-w-0 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-3 text-sm text-text-muted">
          候補が見つかりません
        </p>
      ) : null}
      {isOpen && searchState.status === "success" && searchState.items.length > 0 ? (
        <ul className="min-w-0 max-h-56 overflow-auto rounded-xl border border-stroke-subtle bg-surface-raised p-2 shadow-soft">
          {searchState.items.map((item) => (
            <li key={item.wikiIdentifier}>
              <button
                className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-text-strong transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled || selectedIds.has(item.wikiIdentifier)}
                onClick={() => selectItem(item)}
                type="button"
              >
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="shrink-0 text-xs text-text-muted">{item.slug}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
