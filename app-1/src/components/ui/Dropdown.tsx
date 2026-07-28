import type { ComponentPropsWithRef } from "react";

export type DropdownProps = ComponentPropsWithRef<"details">;
export type DropdownTriggerProps = ComponentPropsWithRef<"summary">;
export type DropdownContentProps = ComponentPropsWithRef<"div">;

export const Dropdown = (props: DropdownProps) => {
  return <details {...props} />;
};

export const DropdownTrigger = (props: DropdownTriggerProps) => {
  return <summary {...props} />;
};

export const DropdownContent = (props: DropdownContentProps) => {
  return <div {...props} />;
};
