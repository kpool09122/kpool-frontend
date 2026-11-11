import { useCallback, useState } from "react";
import { renderXPost } from "@/gateways/wiki/xPostBrowserEmbed";
import { useI18n } from "@/i18n/I18nProvider";

export function XPostEmbed({ postId }: { postId: string }) {
  const { dictionary } = useI18n();
  const [rendered, setRendered] = useState(false);

  const attachPost = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;

    const target = document.createElement("div");
    container.append(target);

    void renderXPost(postId, target).then((success) => {
      if (success && target.isConnected) setRendered(true);
      else target.remove();
    });

    return () => target.remove();
  }, [postId]);

  return (
    <>
      <div ref={attachPost} />
      {!rendered && (
        <a
          className="text-sm text-text-strong underline"
          href={`https://x.com/i/web/status/${postId}`}
          rel="noreferrer"
          target="_blank"
        >
          {dictionary.wiki.ui.openPostOnX}
        </a>
      )}
    </>
  );
}
