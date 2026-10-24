"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  defaultPlayerWidth, fitPlayerPosition, fitPlayerWidth, pinchPlayer, playerHeight,
  resizePlayer, type Frame, type PlayerChrome, type Point, type ResizeEdge,
} from "./floatingGeometry";

type Interaction =
  | { kind: "drag"; pointerId: number; start: Point; origin: Frame }
  | { kind: "resize"; pointerId: number; start: Point; origin: Frame; edge: ResizeEdge }
  | { kind: "pinch"; origin: Frame; center: Point; distance: number };

const resizeEdges: ResizeEdge[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
const viewportSize = () => ({
  width: typeof window === "undefined" ? 1024 : window.innerWidth,
  height: typeof window === "undefined" ? 768 : window.innerHeight,
});
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function useFloatingPosition(root: { current: HTMLElement | null }, floating: boolean) {
  const [position, setPosition] = useState<Point | null>(null);
  const [preferredWidth, setPreferredWidth] = useState(defaultPlayerWidth);
  const [viewport, setViewport] = useState(viewportSize);
  const [chrome, setChrome] = useState<PlayerChrome>({ width: 26, height: 106 });
  const interaction = useRef<Interaction | null>(null);
  const touches = useRef(new Map<number, Point>());
  const width = fitPlayerWidth(preferredWidth, viewport, chrome);
  const size = { width, height: playerHeight(width, chrome) };
  const fittedPosition = position ? fitPlayerPosition(position, size, viewport) : null;

  useEffect(() => {
    if (!floating) return;
    const activeTouches = touches.current;
    const measure = () => {
      const nextViewport = viewportSize();
      setViewport((current) => current.width === nextViewport.width && current.height === nextViewport.height ? current : nextViewport);
      const element = root.current;
      const video = element?.querySelector<HTMLElement>("[data-player-interactive] .aspect-video");
      if (!element || !video || !video.offsetWidth) return;
      const nextChrome = {
        width: element.offsetWidth - video.offsetWidth,
        height: element.scrollHeight - video.offsetHeight + 2,
      };
      setChrome((current) => current.width === nextChrome.width && current.height === nextChrome.height ? current : nextChrome);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (root.current) observer?.observe(root.current);
    window.addEventListener("resize", measure);
    return () => {
      interaction.current = null;
      activeTouches.clear();
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [floating, root]);

  const currentFrame = (): Frame => {
    const rect = root.current?.getBoundingClientRect();
    return {
      x: rect?.left ?? viewport.width - width - 16,
      y: rect?.top ?? viewport.height - size.height - 16,
      width: rect?.width || width,
      height: rect?.height || size.height,
    };
  };
  const applyFrame = (frame: Frame) => {
    setPreferredWidth(frame.width);
    setPosition({ x: frame.x, y: frame.y });
  };
  const finishPointer = useCallback((event: React.PointerEvent<HTMLElement>) => {
    touches.current.delete(event.pointerId);
    const current = interaction.current;
    if (current?.kind === "pinch" || (current && current.pointerId === event.pointerId)) {
      interaction.current = null;
    }
  }, []);

  return {
    style: {
      position: "fixed", width,
      ...(fittedPosition ? { left: fittedPosition.x, top: fittedPosition.y } : { right: 16, bottom: 16 }),
    } as CSSProperties,
    dragProps: {
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        if (event.button !== 0 || !(event.target instanceof Element)) return;
        const target = event.target;
        if (target.closest("[data-player-interactive], button, a, input, select, textarea, [role='button']")) return;
        const point = { x: event.clientX, y: event.clientY };
        if (event.pointerType === "touch") {
          if (touches.current.size >= 2) return;
          touches.current.set(event.pointerId, point);
          if (touches.current.size === 2) {
            const [first, second] = [...touches.current.values()];
            interaction.current = {
              kind: "pinch", origin: currentFrame(),
              center: midpoint(first, second), distance: Math.max(8, distance(first, second)),
            };
          } else {
            interaction.current = { kind: "drag", pointerId: event.pointerId, start: point, origin: currentFrame() };
          }
        } else {
          if (interaction.current || touches.current.size) return;
          const edge = target.closest<HTMLElement>("[data-player-resize]")?.dataset.playerResize;
          interaction.current = edge && resizeEdges.includes(edge as ResizeEdge)
            ? { kind: "resize", pointerId: event.pointerId, start: point, origin: currentFrame(), edge: edge as ResizeEdge }
            : { kind: "drag", pointerId: event.pointerId, start: point, origin: currentFrame() };
        }
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        const point = { x: event.clientX, y: event.clientY };
        if (touches.current.has(event.pointerId)) touches.current.set(event.pointerId, point);
        const current = interaction.current;
        if (!current) return;
        if (current.kind === "pinch") {
          const [first, second] = [...touches.current.values()];
          if (!first || !second) return;
          applyFrame(pinchPlayer(current.origin, current.center, midpoint(first, second),
            distance(first, second) / current.distance, viewport, chrome));
        } else if (current.pointerId === event.pointerId) {
          const delta = { x: point.x - current.start.x, y: point.y - current.start.y };
          if (current.kind === "resize") {
            applyFrame(resizePlayer(current.origin, current.edge, delta, viewport, chrome));
          } else {
            setPosition(fitPlayerPosition({ x: current.origin.x + delta.x, y: current.origin.y + delta.y }, size, viewport));
          }
        }
      },
      onPointerUp: finishPointer,
      onPointerCancel: finishPointer,
      onLostPointerCapture: finishPointer,
    },
    keyboardProps: {
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        const delta = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[event.key];
        if (!delta) return;
        event.preventDefault();
        const origin = currentFrame();
        if (event.shiftKey) {
          applyFrame(resizePlayer(origin, "se", { x: delta[0], y: delta[1] }, viewport, chrome));
        } else {
          setPosition(fitPlayerPosition({ x: origin.x + delta[0], y: origin.y + delta[1] }, size, viewport));
        }
      },
    },
  };
}
