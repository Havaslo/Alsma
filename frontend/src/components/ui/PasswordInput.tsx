import type { ComponentPropsWithRef } from "react";

export type PasswordInputProps = Omit<ComponentPropsWithRef<"input">, "type">;

export const PasswordInput = (props: PasswordInputProps) => {
  return <input type="password" {...props} />;
};
