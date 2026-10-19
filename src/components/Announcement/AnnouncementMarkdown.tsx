import Markdown from "react-markdown";

export function AnnouncementMarkdown({ content }: { content: string }) {
  return (
    <div className="min-w-0 text-sm leading-7 text-text-strong [overflow-wrap:anywhere] [&>*+*]:mt-4 [&_a]:text-brand-primary [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-4 [&_blockquote]:border-stroke-subtle [&_blockquote]:pl-4 [&_blockquote]:text-text-muted [&_code]:rounded [&_code]:bg-surface-base [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold [&_hr]:border-stroke-subtle [&_li+li]:mt-1 [&_li>ol]:mt-2 [&_li>ul]:mt-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:whitespace-pre-wrap [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-stroke-subtle [&_pre]:bg-surface-base [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:pl-6">
      <Markdown
        disallowedElements={["img"]}
        components={{ h1: "h2", h2: "h3", h3: "h4", h4: "h5", h5: "h6", h6: "h6" }}
      >
        {content}
      </Markdown>
    </div>
  );
}
