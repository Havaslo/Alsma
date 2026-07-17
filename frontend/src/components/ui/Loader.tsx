import { cn } from "@/lib/cn";

export const Loader = ({
  className,
  label = "Загрузка",
  size = "md",
}: {
  readonly className?: string;
  readonly label?: string;
  readonly size?: "sm" | "md" | "lg";
}) => (
  <span
    aria-label={label}
    className={cn(
      "relative inline-grid place-items-center rounded-full",
      size === "sm" && "size-5",
      size === "md" && "size-8",
      size === "lg" && "size-12",
      className,
    )}
    role="status"
  >
    <span className="absolute inset-0 animate-spin rounded-full border-2 border-current/15 border-t-current" />
    <span className="size-1/3 animate-pulse rounded-full bg-current" />
  </span>
);
