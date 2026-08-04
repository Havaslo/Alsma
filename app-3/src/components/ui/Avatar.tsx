import { type ComponentPropsWithoutRef, useState } from "react";

import { cn } from "@/lib/cn";

export type AvatarProps = ComponentPropsWithoutRef<"span"> & {
  readonly alt: string;
  readonly fallback?: string;
  readonly src?: string | null;
};

const getInitials = (label: string) => {
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

export const Avatar = ({
  alt,
  children,
  className,
  fallback,
  src,
  ...props
}: AvatarProps) => {
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = Boolean(src) && !hasImageError;

  return (
    <span
      aria-label={alt}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted/70 text-sm font-semibold text-muted-foreground shadow-sm ring-2 shadow-foreground/5 ring-surface",
        className,
      )}
      role="img"
      {...props}
    >
      {showImage ? (
        <img
          alt=""
          className="size-full object-cover"
          src={src ?? undefined}
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span aria-hidden="true">
          {children ?? fallback ?? getInitials(alt)}
        </span>
      )}
    </span>
  );
};
