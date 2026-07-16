import type { ComponentPropsWithRef } from "react";

export type AlertProps = Omit<ComponentPropsWithRef<"div">, "role">;

export const Alert = (props: AlertProps) => {
  return <div role="alert" {...props} />;
};
