import type { ComponentPropsWithRef } from "react";

export type InputProps = ComponentPropsWithRef<"input">;

export const Input = (props: InputProps) => {
  return <input {...props} />;
};
