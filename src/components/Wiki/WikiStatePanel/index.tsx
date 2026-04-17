type WikiStatePanelProps = {
  title: string;
  message: string;
  tone?: "default" | "danger";
};

export function WikiStatePanel({
  title,
  message,
  tone = "default",
}: WikiStatePanelProps) {
  const borderClass =
    tone === "danger"
      ? "border-status-danger/30"
      : "border-stroke-subtle";
  const titleClass =
    tone === "danger" ? "text-status-danger" : "text-text-muted";

  return (
    <main className="min-h-screen bg-surface-base px-6 py-12 text-text-strong sm:px-10">
      <div
        className={`mx-auto max-w-5xl rounded-[2rem] border ${borderClass} bg-surface-raised p-8 shadow-soft`}
      >
        <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${titleClass}`}>
          {title}
        </p>
        <p className="mt-4 text-lg leading-7 text-text-muted">{message}</p>
      </div>
    </main>
  );
}
