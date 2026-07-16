import type { ComponentPropsWithRef } from "react";

export type FormProps = ComponentPropsWithRef<"form">;

export const Form = (props: FormProps) => {
  return <form {...props} />;
};
