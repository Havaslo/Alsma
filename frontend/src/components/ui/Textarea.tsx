import type { ComponentPropsWithRef } from "react";

export type TextareaProps = ComponentPropsWithRef<"textarea">;

export const Textarea = (props: TextareaProps) => {
  return <textarea {...props} />;
};
