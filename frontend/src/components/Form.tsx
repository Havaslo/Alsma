import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
  type FieldValues,
  FormProvider,
  type SubmitErrorHandler,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";

import { cn } from "@/lib/cn";

export type FormProps<TFieldValues extends FieldValues> = Omit<
  ComponentPropsWithoutRef<"form">,
  "children" | "onSubmit"
> & {
  readonly children:
    ReactNode | ((form: UseFormReturn<TFieldValues>) => ReactNode);
  readonly form: UseFormReturn<TFieldValues>;
  readonly onInvalid?: SubmitErrorHandler<TFieldValues>;
  readonly onSubmit: SubmitHandler<TFieldValues>;
};

export const Form = <TFieldValues extends FieldValues>({
  children,
  className,
  form,
  noValidate = true,
  onInvalid,
  onSubmit,
  ...props
}: FormProps<TFieldValues>) => {
  return (
    <FormProvider {...form}>
      <form
        className={cn("space-y-6", className)}
        noValidate={noValidate}
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        {...props}
      >
        {typeof children === "function" ? children(form) : children}
      </form>
    </FormProvider>
  );
};
