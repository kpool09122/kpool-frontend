"use client";

import Autoplay from "embla-carousel-autoplay";
import { Children, useId, useMemo, type ReactNode } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export function HorizontalCarousel({ title, previousLabel, nextLabel, paginationLabel, slideLabel, children, autoPlay = true }: {
  title: string;
  previousLabel: string;
  nextLabel: string;
  paginationLabel: string;
  slideLabel: (position: number) => string;
  children: ReactNode;
  autoPlay?: boolean;
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
  const controlClass = "static size-10 translate-y-0 rounded-full border-stroke-subtle bg-surface-raised text-text-strong";

  return (
    <Carousel
      opts={{ align: "start", loop: true, breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } } }}
      plugins={[autoplay]}
      aria-labelledby={`${id}-heading`}
      className="min-w-0 space-y-4"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={`${id}-heading`} className="text-2xl font-semibold">{title}</h2>
        <div className="flex shrink-0 gap-2">
          <CarouselPrevious type="button" aria-label={previousLabel} aria-controls={`${id}-items`} className={controlClass} />
          <CarouselNext type="button" aria-label={nextLabel} aria-controls={`${id}-items`} className={controlClass} />
        </div>
      </div>
      <CarouselContent id={`${id}-items`} role="list" aria-label={title} className="py-2 touch-pan-y touch-pinch-zoom">
        {Children.map(children, (child) => (
          <CarouselItem role="listitem" className="basis-[calc(78vw+1rem)] max-w-[21rem] sm:basis-76">
            {child}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselDots label={paginationLabel} slideLabel={slideLabel} controlsId={`${id}-items`} />
    </Carousel>
  );
}
