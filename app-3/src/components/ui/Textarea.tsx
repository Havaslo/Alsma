import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

export type TextareaProps = ComponentPropsWithRef<"textarea">;

export const Textarea = ({
  className,
  placeholder = "...",
  rows = 4,
  ...props
}: TextareaProps) => {
  return (
    <textarea
      className={cn("field-control resize-y", className)}
      placeholder={placeholder}
      rows={rows}
      {...props}
    />
  );
};
