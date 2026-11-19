"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

export function HorizontalCarousel({ title, previousLabel, nextLabel, children, beforeItems }: {
  title: string;
  previousLabel: string;
  nextLabel: string;
  children: ReactNode;
  beforeItems?: ReactNode;
}) {
  const id = useId();
  const viewport = useRef<HTMLUListElement>(null);
  const [navigation, setNavigation] = useState({ previous: false, next: false });
  const updateNavigation = useCallback(() => {
    const node = viewport.current;
    if (!node) return;
    setNavigation({
      previous: node.scrollLeft > 1,
      next: node.scrollLeft + node.clientWidth < node.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(updateNavigation);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateNavigation);
    if (viewport.current) observer?.observe(viewport.current);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [updateNavigation, children]);

  const move = (direction: -1 | 1) => {
    const node = viewport.current;
    if (!node) return;
    node.scrollBy({
      left: direction * node.clientWidth,
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };
  const buttonClass = "inline-flex size-10 items-center justify-center rounded-full border border-stroke-subtle bg-surface-raised text-text-strong transition hover:border-brand-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-default disabled:opacity-30";

  return (
    <section aria-labelledby={`${id}-heading`} className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id={`${id}-heading`} className="text-2xl font-semibold">{title}</h2>
        <div className="flex shrink-0 gap-2">
          <button type="button" aria-label={previousLabel} aria-controls={`${id}-items`} disabled={!navigation.previous} onClick={() => move(-1)} className={buttonClass}>
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
          <button type="button" aria-label={nextLabel} aria-controls={`${id}-items`} disabled={!navigation.next} onClick={() => move(1)} className={buttonClass}>
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
      </div>
      {beforeItems}
      <ul
        id={`${id}-items`}
        ref={viewport}
        tabIndex={0}
        aria-label={title}
        onScroll={updateNavigation}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        {children}
      </ul>
    </section>
  );
}
