export function ThemeToggle() {
  return (
    <div className="flex items-center gap-3 rounded-full border border-white/18 bg-white/10 px-3 py-2 text-sm text-white/86 backdrop-blur">
      <span
        data-testid="theme-mode-label"
        data-theme-label
        className="font-medium uppercase tracking-[0.16em]"
      >
        Light
      </span>
      <button
        type="button"
        data-theme-toggle
        aria-label="Toggle color theme"
        className="rounded-full border border-white/24 bg-white/14 px-3 py-1 font-medium text-white transition hover:bg-white/22"
      >
        Switch
      </button>
    </div>
  );
}
