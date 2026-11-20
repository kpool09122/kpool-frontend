"use client";

import { cn } from "@/lib/utils";
import Autoplay from "embla-carousel-autoplay";
import { Children, useId, useMemo, type ReactNode } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
} from "@/components/ui/carousel";

export function HorizontalCarousel({ title, paginationLabel, slideLabel, children, autoPlay = true, direction = "ltr", itemClassName, headerActions, emptyState }: {
  title: string;
  paginationLabel: string;
  slideLabel: (position: number) => string;
  children: ReactNode;
  autoPlay?: boolean;
  direction?: "ltr" | "rtl";
  itemClassName?: string;
  headerActions?: ReactNode;
  emptyState?: ReactNode;
}) {
  const id = useId();
  const autoplay = useMemo(() => Autoplay({
    delay: 5000,
    active: autoPlay,
    stopOnInteraction: false,
    stopOnMouseEnter: true,
    stopOnFocusIn: true,
    rootNode: (root) => root.parentElement,
    breakpoints: { "(prefers-reduced-motion: reduce)": { active: false } },
  }), [autoPlay]);

  return (
    <Carousel
      opts={{ align: "start", loop: true, direction, breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } } }}
      plugins={[autoplay]}
      aria-labelledby={`${id}-heading`}
      className="min-w-0 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id={`${id}-heading`} className="text-2xl font-semibold">{title}</h2>
        {headerActions}
      </div>
      {Children.count(children) > 0 ? <CarouselContent id={`${id}-items`} role="list" aria-label={title} dir={direction} className={cn("py-2 touch-pan-y touch-pinch-zoom", direction === "rtl" && "ml-0 -mr-4")}>
        {Children.map(children, (child) => (
          <CarouselItem role="listitem" dir="ltr" className={cn("basis-[calc(78vw+1rem)] max-w-[21rem] sm:basis-76", itemClassName, direction === "rtl" && "pl-0 pr-4")}>
            {child}
          </CarouselItem>
        ))}
      </CarouselContent> : emptyState}
      {Children.count(children) > 0 && <CarouselDots label={paginationLabel} slideLabel={slideLabel} controlsId={`${id}-items`} />}
    </Carousel>
  );
}
