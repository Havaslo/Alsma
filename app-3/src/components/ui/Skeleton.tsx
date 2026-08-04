import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export type SkeletonProps = ComponentPropsWithoutRef<"div">;

export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-xl bg-muted-foreground/10",
        className,
      )}
      {...props}
    />
  );
};
