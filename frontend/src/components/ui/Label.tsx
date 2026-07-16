import type { ComponentPropsWithRef } from "react";

export type LabelProps = ComponentPropsWithRef<"label">;

export const Label = (props: LabelProps) => {
  return <label {...props} />;
};
