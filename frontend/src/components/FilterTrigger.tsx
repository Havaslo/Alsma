import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { ListFilter, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export type FilterTriggerProps = {
  /** Number shown beside the trigger label. */
  readonly activeCount?: number;
  /** Filter form rendered inside the sliding panel. */
  readonly children: ReactNode;
  readonly closeLabel?: string;
  readonly label?: string;
  readonly onReset?: () => void;
  readonly resetLabel?: string;
  readonly title?: string;
};

export const FilterTrigger = ({
  activeCount = 0,
  children,
  closeLabel = "Done",
  label = "Filters",
  onReset,
  resetLabel = "Reset",
  title = "Filters",
}: FilterTriggerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const trigger = triggerRef.current;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    const focusFrame = window.requestAnimationFrame(() =>
      closeButtonRef.current?.focus(),
    );

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [isOpen]);

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const panel =
    typeof document === "undefined"
      ? null
      : createPortal(
          <div
            aria-hidden={!isOpen}
            className={cn(
              "fixed inset-0 z-50 overscroll-contain transition-[visibility] duration-300",
              isOpen ? "visible" : "invisible delay-300",
            )}
          >
            <button
              aria-label={`Close ${title}`}
              className={cn(
                "absolute inset-0 bg-page-foreground/35 backdrop-blur-sm transition-opacity duration-300 in-data-[theme=dark]:bg-page/75",
                isOpen ? "opacity-100" : "opacity-0",
              )}
              onClick={() => setIsOpen(false)}
              tabIndex={-1}
              type="button"
            />
            <section
              aria-labelledby={titleId}
              aria-modal="true"
              className={cn(
                "absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line/60 bg-panel/95 text-panel-foreground shadow-2xl shadow-page-foreground/15 backdrop-blur-xl transition-transform duration-300 sm:my-3 sm:mr-3 sm:rounded-3xl sm:border",
                isOpen ? "translate-x-0" : "translate-x-full",
              )}
              onKeyDown={handlePanelKeyDown}
              ref={panelRef}
              role="dialog"
            >
              <header className="flex min-h-18 items-center justify-between gap-4 border-b border-line/60 px-5">
                <h2 className="font-heading text-xl font-semibold" id={titleId}>
                  {title}
                </h2>
                <Button
                  aria-label={`Close ${title}`}
                  className="size-10 shrink-0 p-0"
                  onClick={() => setIsOpen(false)}
                  ref={closeButtonRef}
                  variant="secondary"
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {children}
              </div>
              <footer
                className={cn(
                  "grid gap-3 border-t border-line/60 bg-muted-ui/20 p-4",
                  onReset && "grid-cols-2",
                )}
              >
                {onReset && (
                  <Button
                    className="w-full"
                    onClick={onReset}
                    variant="secondary"
                  >
                    {resetLabel}
                  </Button>
                )}
                <Button className="w-full" onClick={() => setIsOpen(false)}>
                  {closeLabel}
                </Button>
              </footer>
            </section>
          </div>,
          document.body,
        );

  return (
    <>
      <Button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        ref={triggerRef}
        variant="secondary"
      >
        <ListFilter aria-hidden="true" className="size-4" />
        {label}
        {activeCount > 0 && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-brand-foreground">
            {activeCount}
          </span>
        )}
      </Button>
      {panel}
    </>
  );
};
