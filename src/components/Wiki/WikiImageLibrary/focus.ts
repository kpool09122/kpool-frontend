const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([tabindex="-1"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute("hidden") && element.tabIndex >= 0,
  );
