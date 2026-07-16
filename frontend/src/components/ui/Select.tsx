import type { ComponentPropsWithRef } from "react";

export type SelectProps = ComponentPropsWithRef<"select">;

export const Select = (props: SelectProps) => {
  return <select {...props} />;
};
