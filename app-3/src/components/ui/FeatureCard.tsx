import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export type FeatureCardProps = {
  /** Optional footer content, usually a Button or link. */
  readonly action?: ReactNode;
  readonly className?: string;
  readonly description: ReactNode;
  /** Short category or status shown above the title. */
  readonly eyebrow?: ReactNode;
  readonly icon?: ReactNode;
  /** Full-width content rendered above the header. */
  readonly media?: ReactNode;
  readonly title: ReactNode;
};

export const FeatureCard = ({
  action,
  className,
  description,
  eyebrow,
  icon,
  media,
  title,
}: FeatureCardProps) => {
  return (
    <Card className={cn("flex h-full flex-col overflow-hidden", className)}>
      {media && <div className="overflow-hidden bg-muted">{media}</div>}
      <CardHeader className="flex grid-cols-none flex-row items-start gap-4">
        {icon && (
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </span>
        )}
        <span className="grid gap-1.5">
          {eyebrow && (
            <span className="text-xs font-semibold tracking-wide text-primary uppercase">
              {eyebrow}
            </span>
          )}
          <CardTitle>{title}</CardTitle>
        </span>
      </CardHeader>
      <CardContent className="flex-1">
        <CardDescription>{description}</CardDescription>
      </CardContent>
      {action && <CardFooter>{action}</CardFooter>}
    </Card>
  );
};
