"use client";

import { AdminNavigationLink } from "./AdminNavigationLink";

export function AdminSectionTabs({ label, tabs, activeTab }: {
  label: string;
  tabs: readonly { id: string; label: string; href: string }[];
  activeTab: string;
}) {
  return (
    <div className="overflow-x-auto border-b border-stroke-subtle">
      <div aria-label={label} className="-mb-px flex gap-1" role="tablist">
        {tabs.map(tab => (
          <AdminNavigationLink
            aria-selected={activeTab === tab.id}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-brand-primary text-text-strong"
                : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"
            }`}
            key={tab.id}
            href={tab.href}
            role="tab"
          >
            {tab.label}
          </AdminNavigationLink>
        ))}
      </div>
    </div>
  );
}
