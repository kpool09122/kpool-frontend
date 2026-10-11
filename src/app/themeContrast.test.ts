import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");
const rgb = (hex: string) => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
const luminance = (values: number[]) => values.reduce((sum, value, index) => sum + [0.2126, 0.7152, 0.0722][index] * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4), 0);

it.each([":root", ':root[data-theme="dark"]', '.wiki-theme-scope[data-theme="light"]', '.wiki-theme-scope[data-theme="dark"]'])("keeps status text readable in %s", (selector) => {
  const block = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
  const token = (name: string) => block.match(new RegExp(`--${name}: (#[0-9a-f]{6});`))?.[1] ?? "";
  for (const status of ["success", "warning", "danger"]) {
    const foreground = rgb(token(`status-${status}`));
    for (const surface of ["surface-base", "surface-raised"]) {
      // Status panels tint the underlying surface by 10%.
      const background = rgb(token(surface)).map((value, index) => value * 0.9 + foreground[index] * 0.1);
      const [low, high] = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
      expect((high + 0.05) / (low + 0.05), `${selector} ${status} on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});
