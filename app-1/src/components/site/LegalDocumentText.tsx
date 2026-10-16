import type { ReactNode } from "react";

const renderInline = (text: string): ReactNode[] =>
  text.split(/(\[[^\]]+\]\([^)]+\))/gu).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/u);
    if (!link) return part;
    return (
      <a
        className="font-medium text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
        href={link[2]}
        key={`${link[2]}-${index}`}
      >
        {link[1]}
      </a>
    );
  });

export const LegalDocumentText = ({
  content,
}: {
  readonly content: string;
}) => (
  <div className="mt-10 space-y-6 text-[1.02rem] leading-8 text-muted-ui-foreground">
    {content
      .trim()
      .split(/\n\s*\n/gu)
      .map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim());
        const firstLine = lines[0] ?? "";
        if (firstLine.startsWith("## "))
          return (
            <h2
              className="pt-4 font-heading text-2xl font-semibold text-brand sm:text-3xl"
              key={`${firstLine}-${index}`}
            >
              {renderInline(firstLine.slice(3))}
            </h2>
          );
        if (lines.length > 1 && lines.every((line) => /^\s*[-•]\s/u.test(line)))
          return (
            <ul className="list-disc space-y-2 pl-6" key={index}>
              {lines.map((line) => (
                <li key={line}>
                  {renderInline(line.replace(/^\s*[-•]\s/u, ""))}
                </li>
              ))}
            </ul>
          );
        if (lines.length > 1 && lines.every((line) => /^\d+\.\s/u.test(line)))
          return (
            <ol className="list-decimal space-y-2 pl-6" key={index}>
              {lines.map((line) => (
                <li key={line}>
                  {renderInline(line.replace(/^\d+\.\s/u, ""))}
                </li>
              ))}
            </ol>
          );
        return (
          <p key={index}>
            {lines.map((line, lineIndex) => (
              <span key={`${line}-${lineIndex}`}>
                {lineIndex > 0 && " "}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
  </div>
);
