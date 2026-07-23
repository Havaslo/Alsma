import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

export type CardProps = ComponentPropsWithRef<"div">;
export type CardTitleProps = ComponentPropsWithRef<"h3">;
export type CardDescriptionProps = ComponentPropsWithRef<"p">;

export const Card = ({ className, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        "rounded-3xl border border-line/70 bg-panel/85 text-panel-foreground shadow-sm shadow-page-foreground/5",
        className,
      )}
      {...props}
    />
  );
};

export const CardHeader = ({ className, ...props }: CardProps) => {
  return (
    <div className={cn("grid gap-1.5 p-5 sm:p-6", className)} {...props} />
  );
};

export const CardTitle = ({ className, ...props }: CardTitleProps) => {
  return (
    <h3
      className={cn(
        "font-heading text-lg font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
};

export const CardDescription = ({
  className,
  ...props
}: CardDescriptionProps) => {
  return (
    <p
      className={cn("text-sm leading-6 text-muted-ui-foreground", className)}
      {...props}
    />
  );
};

export const CardContent = ({ className, ...props }: CardProps) => {
  return (
    <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)} {...props} />
  );
};

export const CardFooter = ({ className, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-line/60 bg-muted-ui/20 px-5 py-4 sm:px-6",
        className,
      )}
      {...props}
    />
  );
};
