import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useState,
} from "react";

import { cn } from "@/lib/cn";

export type TabItem = {
  readonly content: ReactNode;
  readonly disabled?: boolean;
  readonly label: ReactNode;
  readonly value: string;
};

export type TabsProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "defaultValue"
> & {
  readonly ariaLabel: string;
  readonly defaultValue?: string;
  readonly items: readonly TabItem[];
  readonly onValueChange?: (value: string) => void;
  readonly value?: string;
};

export const Tabs = ({
  ariaLabel,
  className,
  defaultValue,
  items,
  onValueChange,
  value,
  ...props
}: TabsProps) => {
  const tabsId = useId();
  const firstEnabledValue = items.find((item) => !item.disabled)?.value;
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? firstEnabledValue,
  );
  const activeValue = value ?? internalValue;
  const activeItem = items.find((item) => item.value === activeValue);

  const selectTab = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentValue: string,
  ) => {
    const enabledItems = items.filter((item) => !item.disabled);
    const currentIndex = enabledItems.findIndex(
      (item) => item.value === currentValue,
    );

    if (currentIndex < 0) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % enabledItems.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = enabledItems.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextItem = enabledItems[nextIndex];
    selectTab(nextItem.value);
    document.getElementById(`${tabsId}-tab-${nextItem.value}`)?.focus();
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <div
        aria-label={ariaLabel}
        className="flex w-fit max-w-full gap-1 overflow-x-auto overflow-y-hidden rounded-xl bg-muted/55 p-1"
        role="tablist"
      >
        {items.map((item) => {
          const isActive = item.value === activeValue;

          return (
            <button
              aria-controls={`${tabsId}-panel-${item.value}`}
              aria-selected={isActive}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-[color,background-color,box-shadow] focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-muted-foreground/50",
                isActive
                  ? "bg-surface text-surface-foreground shadow-sm shadow-foreground/10"
                  : "text-muted-foreground hover:bg-surface/50 hover:text-foreground",
              )}
              disabled={item.disabled}
              id={`${tabsId}-tab-${item.value}`}
              key={item.value}
              onClick={() => selectTab(item.value)}
              onKeyDown={(event) => handleKeyDown(event, item.value)}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeItem && (
        <div
          aria-labelledby={`${tabsId}-tab-${activeItem.value}`}
          className="pt-5 focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none"
          id={`${tabsId}-panel-${activeItem.value}`}
          role="tabpanel"
          tabIndex={0}
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
};
