import {
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

export type SelectOption = {
  readonly disabled?: boolean;
  /** Visible option content. */
  readonly label: ReactNode;
  /** Submitted and emitted option value. */
  readonly value: string;
};

export type SelectProps = Omit<
  ComponentPropsWithRef<"button">,
  "children" | "defaultValue" | "name" | "onChange" | "type" | "value"
> & {
  readonly defaultValue?: string;
  /** Adds a hidden input for native form submission. */
  readonly name?: string;
  /** Called after an enabled option is selected. */
  readonly onValueChange?: (value: string) => void;
  readonly options: readonly SelectOption[];
  readonly placeholder?: ReactNode;
  /** Controlled value; omit to use defaultValue or the first enabled option. */
  readonly value?: string;
};

export const Select = ({
  className,
  defaultValue,
  disabled,
  name,
  onClick,
  onKeyDown,
  onValueChange,
  options,
  placeholder = "...",
  ref,
  value,
  ...props
}: SelectProps) => {
  const selectId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const firstEnabledValue = options.find((option) => !option.disabled)?.value;
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? firstEnabledValue,
  );
  const [isOpen, setIsOpen] = useState(false);
  const selectedValue = value ?? internalValue;
  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );
  const enabledOptions = options.filter((option) => !option.disabled);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);

  const assignTriggerRef = (node: HTMLButtonElement | null) => {
    triggerRef.current = node;

    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as { current: HTMLButtonElement | null }).current = node;
    }
  };

  const focusOption = (optionValue: string) => {
    window.requestAnimationFrame(() =>
      optionRefs.current.get(optionValue)?.focus(),
    );
  };

  const openAndFocus = (optionValue: string | undefined) => {
    if (!optionValue) return;
    setIsOpen(true);
    focusOption(optionValue);
  };

  const selectValue = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAndFocus(selectedOption?.value ?? enabledOptions[0]?.value);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAndFocus(
        selectedOption?.value ??
          enabledOptions[enabledOptions.length - 1]?.value,
      );
    }
  };

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    optionValue: string,
  ) => {
    const currentIndex = enabledOptions.findIndex(
      (option) => option.value === optionValue,
    );
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % enabledOptions.length;
    } else if (event.key === "ArrowUp") {
      nextIndex =
        (currentIndex - 1 + enabledOptions.length) % enabledOptions.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = enabledOptions.length - 1;
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setIsOpen(false);
    }

    if (nextIndex === null || currentIndex < 0) return;
    event.preventDefault();
    focusOption(enabledOptions[nextIndex].value);
  };

  return (
    <div className="relative" ref={containerRef}>
      {name && <input name={name} type="hidden" value={selectedValue ?? ""} />}
      <button
        aria-controls={`${selectId}-listbox`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex field-control items-center justify-between gap-3 text-left hover:border-line",
          className,
        )}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;

          if (isOpen) {
            setIsOpen(false);
          } else {
            openAndFocus(selectedOption?.value ?? enabledOptions[0]?.value);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        ref={assignTriggerRef}
        type="button"
        {...props}
      >
        <span
          className={selectedOption ? undefined : "text-muted-ui-foreground"}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-muted-ui-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <div
        aria-hidden={!isOpen}
        className={cn(
          "absolute z-30 mt-2 w-full origin-top rounded-2xl border border-line/70 bg-panel/95 p-1.5 text-panel-foreground shadow-lg shadow-page-foreground/5 backdrop-blur-xl transition-[opacity,transform] duration-150",
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0",
        )}
        id={`${selectId}-listbox`}
        inert={!isOpen}
        role="listbox"
      >
        {options.map((option) => {
          const isSelected = option.value === selectedValue;

          return (
            <button
              aria-selected={isSelected}
              className={cn(
                "group flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-4 focus-visible:ring-focus/15 disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "bg-brand/10 font-medium text-brand hover:bg-brand/15"
                  : "hover:bg-brand/5 hover:text-panel-foreground focus-visible:bg-brand/5",
              )}
              disabled={option.disabled}
              id={`${selectId}-option-${option.value}`}
              key={option.value}
              onClick={() => selectValue(option.value)}
              onKeyDown={(event) => handleOptionKeyDown(event, option.value)}
              ref={(node) => {
                if (node) optionRefs.current.set(option.value, node);
                else optionRefs.current.delete(option.value);
              }}
              role="option"
              type="button"
            >
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3 transition-transform duration-150 group-hover:translate-x-1">
                {option.label}
                <Check
                  aria-hidden="true"
                  className={isSelected ? "size-4" : "size-4 opacity-0"}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
