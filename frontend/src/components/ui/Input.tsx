import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

/** Styled text-like input. Use DateInput instead of type="date". */
export type InputProps = ComponentPropsWithRef<"input">;

export const Input = ({
  className,
  placeholder,
  type,
  ...props
}: InputProps) => {
  return (
    <input
      className={cn("field-control", className)}
      placeholder={placeholder ?? (type === "number" ? "0" : "...")}
      type={type}
      {...props}
    />
  );
};
