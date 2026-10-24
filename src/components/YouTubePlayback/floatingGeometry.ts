export type Point = { x: number; y: number };
export type Frame = Point & { width: number; height: number };
export type Viewport = { width: number; height: number };
export type PlayerChrome = { width: number; height: number };
export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const defaultPlayerWidth = 480;
export const videoAspectRatio = 9 / 16;

export function fitPlayerWidth(width: number, viewport: Viewport, chrome: PlayerChrome) {
  const maximum = Math.max(1, Math.min(
    viewport.width - 32,
    (viewport.height - 32 - chrome.height) / videoAspectRatio + chrome.width,
  ));
  return Math.max(Math.min(280, maximum), Math.min(width, maximum));
}

export function playerHeight(width: number, chrome: PlayerChrome) {
  return Math.max(0, width - chrome.width) * videoAspectRatio + chrome.height;
}

export function fitPlayerPosition(point: Point, size: Viewport, viewport: Viewport): Point {
  return {
    x: Math.max(8, Math.min(point.x, viewport.width - size.width - 8)),
    y: Math.max(8, Math.min(point.y, viewport.height - size.height - 8)),
  };
}

export function resizePlayer(
  origin: Frame, edge: ResizeEdge, delta: Point, viewport: Viewport, chrome: PlayerChrome,
): Frame {
  const horizontal = edge.includes("e") ? delta.x : edge.includes("w") ? -delta.x : 0;
  const vertical = edge.includes("s") ? delta.y / videoAspectRatio : edge.includes("n") ? -delta.y / videoAspectRatio : 0;
  const change = Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical;
  const width = fitPlayerWidth(origin.width + change, viewport, chrome);
  const height = playerHeight(width, chrome);
  const x = edge.includes("w") ? origin.x + origin.width - width
    : edge.includes("e") ? origin.x : origin.x + (origin.width - width) / 2;
  const y = edge.includes("n") ? origin.y + origin.height - height : origin.y;
  return { ...fitPlayerPosition({ x, y }, { width, height }, viewport), width, height };
}

export function pinchPlayer(
  origin: Frame, center: Point, nextCenter: Point, scale: number,
  viewport: Viewport, chrome: PlayerChrome,
): Frame {
  const width = fitPlayerWidth(origin.width * scale, viewport, chrome);
  const height = playerHeight(width, chrome);
  const point = {
    x: nextCenter.x - (center.x - origin.x) * width / origin.width,
    y: nextCenter.y - (center.y - origin.y) * height / origin.height,
  };
  return { ...fitPlayerPosition(point, { width, height }, viewport), width, height };
}
