import type { ComponentPropsWithRef } from "react";

export type ToggleProps = Omit<ComponentPropsWithRef<"input">, "role" | "type">;

export const Toggle = (props: ToggleProps) => {
  return <input role="switch" type="checkbox" {...props} />;
};
