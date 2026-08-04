import type { ReactNode } from "react";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export type StatCardProps = {
  /** Optional compact comparison or status value. */
  readonly change?: ReactNode;
  readonly className?: string;
  readonly icon?: ReactNode;
  readonly label: ReactNode;
  /** Controls the change indicator color and icon. */
  readonly trend?: "down" | "neutral" | "up";
  readonly value: ReactNode;
};

export const StatCard = ({
  change,
  className,
  icon,
  label,
  trend = "neutral",
  value,
}: StatCardProps) => {
  const TrendIcon = trend === "down" ? TrendingDown : TrendingUp;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex grid-cols-none flex-row items-start justify-between gap-4 pb-3">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-4">
        <strong className="font-primary text-3xl font-semibold tracking-tight">
          {value}
        </strong>
        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              trend === "up" && "bg-primary/10 text-primary",
              trend === "down" && "bg-danger/10 text-danger",
              trend === "neutral" && "bg-muted text-muted-foreground",
            )}
          >
            {trend !== "neutral" && (
              <TrendIcon aria-hidden="true" className="size-3.5" />
            )}
            {change}
          </span>
        )}
      </CardContent>
    </Card>
  );
};
