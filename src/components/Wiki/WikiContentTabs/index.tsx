"use client";

import { type KeyboardEvent, type ReactNode, useId, useState } from "react";

export type WikiContentTab = {
  id: string;
  label: string;
  panel: ReactNode;
};

type WikiContentTabsProps = {
  ariaLabel: string;
  tabs: readonly WikiContentTab[];
};

export function WikiContentTabs({ ariaLabel, tabs }: WikiContentTabsProps) {
  const instanceId = useId();
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id ?? "");
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  if (!activeTab) {
    return null;
  }

  const selectAdjacentTab = (currentIndex: number, direction: 1 | -1) => {
    const nextTab = tabs.at((currentIndex + direction + tabs.length) % tabs.length);

    if (nextTab) {
      setActiveTabId(nextTab.id);
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectAdjacentTab(currentIndex, 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectAdjacentTab(currentIndex, -1);
    }
  };

  return (
    <section>
      <div className="overflow-x-auto border-b border-stroke-subtle">
        <div
          aria-label={ariaLabel}
          className="-mb-px flex min-w-max gap-2"
          role="tablist"
        >
          {tabs.map((tab, index) => {
            const tabId = `${instanceId}-${tab.id}-tab`;
            const panelId = `${instanceId}-${tab.id}-panel`;
            const isSelected = tab.id === activeTab.id;

            return (
              <button
                aria-controls={panelId}
                aria-selected={isSelected}
                className={`whitespace-nowrap border-b-2 px-6 py-4 text-base font-semibold transition sm:px-8 sm:text-lg ${
                  isSelected
                    ? "border-brand-primary text-text-strong"
                    : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"
                }`}
                id={tabId}
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                role="tab"
                tabIndex={isSelected ? 0 : -1}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {tabs.map((tab) => {
        const isSelected = tab.id === activeTab.id;

        if (!isSelected) {
          return null;
        }

        return (
          <div
            aria-labelledby={`${instanceId}-${tab.id}-tab`}
            className="pt-6"
            id={`${instanceId}-${tab.id}-panel`}
            key={tab.id}
            role="tabpanel"
          >
            {tab.panel}
          </div>
        );
      })}
    </section>
  );
}
