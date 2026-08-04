import type { ReactNode } from "react";

export type TooltipProps = {
  readonly children: ReactNode;
  readonly content: ReactNode;
  readonly disabled?: boolean;
};

export const Tooltip = ({
  children,
  content,
  disabled = false,
}: TooltipProps) => {
  return (
    <span className="group relative inline-flex">
      {children}
      {!disabled && (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 translate-y-1 scale-95 rounded-xl bg-foreground px-3 py-2 text-xs font-medium whitespace-nowrap text-background opacity-0 shadow-xl transition duration-200 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100"
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  );
};
