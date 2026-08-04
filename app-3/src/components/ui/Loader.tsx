import type { ComponentPropsWithoutRef } from "react";

import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/cn";

const loaderSizes = {
  lg: "size-8",
  md: "size-5",
  sm: "size-4",
} as const;

export type LoaderProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  readonly label?: string;
  readonly showLabel?: boolean;
  readonly size?: keyof typeof loaderSizes;
};

export const Loader = ({
  className,
  label = "Loading",
  showLabel = false,
  size = "md",
  ...props
}: LoaderProps) => {
  return (
    <div
      aria-live="polite"
      className={cn(
        "inline-flex items-center justify-center gap-2 text-muted-foreground",
        className,
      )}
      role="status"
      {...props}
    >
      <LoaderCircle
        aria-hidden="true"
        className={cn("animate-spin", loaderSizes[size])}
      />
      <span className={showLabel ? "text-sm" : "sr-only"}>{label}</span>
    </div>
  );
};
