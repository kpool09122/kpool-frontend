import { afterEach, describe, expect, it, vi } from "vitest";

import { cropImageToDataUrl } from "./imageCrop";

describe("cropImageToDataUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["image/jpeg", "image/jpeg"],
    ["image/png", "image/png"],
    ["image/webp", "image/webp"],
    ["image/svg+xml", "image/png"],
  ])("crops %s to %s using the source image pixels", (sourceMimeType, outputMimeType) => {
    const drawImage = vi.fn();

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      `data:${outputMimeType};base64,CROPPED`,
    );

    const image = document.createElement("img");

    Object.defineProperties(image, {
      naturalWidth: { configurable: true, value: 1000 },
      naturalHeight: { configurable: true, value: 500 },
      width: { configurable: true, value: 500 },
      height: { configurable: true, value: 250 },
    });
    vi.spyOn(image, "getBoundingClientRect").mockReturnValue({
      width: 500,
      height: 250,
      x: 0,
      y: 0,
      top: 0,
      right: 500,
      bottom: 250,
      left: 0,
      toJSON: () => ({}),
    });

    const result = cropImageToDataUrl({
      crop: {
        unit: "px",
        x: 50,
        y: 25,
        width: 100,
        height: 50,
      },
      image,
      sourceDataUrl: `data:${sourceMimeType};base64,SOURCE`,
    });

    expect(result).toEqual({ ok: true, dataUrl: `data:${outputMimeType};base64,CROPPED` });
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith(outputMimeType);
    expect(drawImage).toHaveBeenCalledWith(
      image,
      100,
      50,
      200,
      100,
      0,
      0,
      200,
      100,
    );
  });
});
