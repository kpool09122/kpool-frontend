import { describe, expect, it } from "vitest";
import { fitPlayerWidth, pinchPlayer, playerHeight, resizePlayer, type ResizeEdge } from "./floatingGeometry";

const viewport = { width: 1200, height: 900 };
const chrome = { width: 26, height: 106 };
const origin = { x: 400, y: 300, width: 480, height: playerHeight(480, chrome) };

describe("floating player geometry", () => {
  it("fits both viewport dimensions while preserving the video aspect ratio", () => {
    const small = { width: 390, height: 300 };
    const width = fitPlayerWidth(800, small, chrome);
    expect(width).toBeLessThanOrEqual(small.width - 32);
    expect(playerHeight(width, chrome)).toBeLessThanOrEqual(small.height - 32);
    expect((playerHeight(width, chrome) - chrome.height) / (width - chrome.width)).toBeCloseTo(9 / 16);
  });
  it("keeps the opposite corner anchored when resizing from the top left", () => {
    const next = resizePlayer(origin, "nw", { x: -80, y: -45 }, viewport, chrome);
    expect(next.width).toBeCloseTo(560);
    expect(next.x + next.width).toBeCloseTo(origin.x + origin.width);
    expect(next.y + next.height).toBeCloseTo(origin.y + origin.height);
  });
  it.each(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as ResizeEdge[])(
    "keeps resizing from %s within the viewport", (edge) => {
      const next = resizePlayer(origin, edge, { x: 4000, y: 4000 }, viewport, chrome);
      expect(next.x).toBeGreaterThanOrEqual(8);
      expect(next.y).toBeGreaterThanOrEqual(8);
      expect(next.x + next.width).toBeLessThanOrEqual(viewport.width - 8);
      expect(next.y + next.height).toBeLessThanOrEqual(viewport.height - 8);
      expect(next.width).toBeGreaterThanOrEqual(280);
    },
  );
  it("shrinks around the pinch center and follows its movement", () => {
    const next = pinchPlayer(origin, { x: 600, y: 340 }, { x: 620, y: 350 }, 0.75, viewport, chrome);
    expect(next.width).toBe(360);
    expect(next.x).toBeCloseTo(470);
    expect((350 - next.y) / next.height).toBeCloseTo(40 / origin.height);
  });
  it("limits an extreme pinch to the available screen size", () => {
    const next = pinchPlayer(origin, { x: 600, y: 340 }, { x: 620, y: 350 }, 10, viewport, chrome);
    expect(next.x + next.width).toBeLessThanOrEqual(viewport.width - 8);
    expect(next.y + next.height).toBeLessThanOrEqual(viewport.height - 8);
  });
});
