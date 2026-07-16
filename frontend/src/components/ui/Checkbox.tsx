import type { ComponentPropsWithRef } from "react";

export type CheckboxProps = Omit<ComponentPropsWithRef<"input">, "type">;

export const Checkbox = (props: CheckboxProps) => {
  return <input type="checkbox" {...props} />;
};
