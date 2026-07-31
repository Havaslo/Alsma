import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";

import { X } from "lucide-react";
import {
  AnimatePresence,
  type HTMLMotionProps,
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
} from "motion/react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export type ModalProps = Omit<
  HTMLMotionProps<"section">,
  "children" | "title"
> & {
  readonly children: ReactNode;
  readonly closeLabel?: string;
  readonly closeButtonClassName?: string;
  /** Optional action row rendered below the scrollable body. */
  readonly footer?: ReactNode;
  readonly headerContent?: ReactNode;
  readonly headerClassName?: string;
  readonly hideHeader?: boolean;
  readonly onClose: () => void;
  readonly titleClassName?: string;
  /** Keep Modal mounted and toggle this value so exit animation can finish. */
  readonly open: boolean;
  readonly title: string;
};

export const Modal = ({
  children,
  className,
  closeButtonClassName,
  closeLabel = "Close",
  footer,
  headerClassName,
  headerContent,
  hideHeader = false,
  onClose,
  onKeyDown,
  open,
  title,
  titleClassName,
  ...props
}: ModalProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    const focusFrame = window.requestAnimationFrame(() =>
      closeButtonRef.current?.focus(),
    );
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus();
    };
  }, [onClose, open]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Tab") return;

    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {open && (
          <m.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-page-foreground/35 p-4 backdrop-blur-sm in-data-[theme=dark]:bg-page/75"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="modal-backdrop"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) onClose();
            }}
            transition={{ duration: reduceMotion ? 0 : 0.14, ease: "easeOut" }}
          >
            <m.section
              animate={{ opacity: 1, scale: 1, y: 0 }}
              aria-labelledby={titleId}
              aria-modal="true"
              className={cn(
                "relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line/70 bg-panel/95 text-panel-foreground shadow-2xl",
                className,
              )}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              onKeyDown={handleKeyDown}
              ref={modalRef}
              role="dialog"
              transition={{
                duration: reduceMotion ? 0 : 0.18,
                ease: open ? [0.16, 1, 0.3, 1] : "easeIn",
              }}
              {...props}
            >
              {hideHeader ? (
                <h2 className="sr-only" id={titleId}>
                  {title}
                </h2>
              ) : (
                <header
                  className={cn(
                    "flex items-center justify-between gap-4 border-b border-line/60 px-6 py-5",
                    headerClassName,
                  )}
                >
                  {headerContent ? (
                    <div className="min-w-0 flex-1">
                      <h2 className="sr-only" id={titleId}>
                        {title}
                      </h2>
                      {headerContent}
                    </div>
                  ) : (
                    <h2
                      className={cn(
                        "m-0 font-heading text-xl font-semibold",
                        titleClassName,
                      )}
                      id={titleId}
                    >
                      {title}
                    </h2>
                  )}
                  <Button
                    aria-label={closeLabel}
                    className={cn("size-10 shrink-0 p-0", closeButtonClassName)}
                    onClick={onClose}
                    ref={closeButtonRef}
                    title={closeLabel}
                    variant="secondary"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                </header>
              )}
              {hideHeader && (
                <Button
                  aria-label={closeLabel}
                  className={cn(
                    "absolute top-4 right-4 z-10 size-10 bg-page/90 p-0 shadow-sm",
                    closeButtonClassName,
                  )}
                  onClick={onClose}
                  ref={closeButtonRef}
                  title={closeLabel}
                  variant="secondary"
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              )}
              <div
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto px-6 py-5",
                  hideHeader && "pt-0",
                )}
              >
                {children}
              </div>
              {footer && (
                <footer className="flex flex-wrap justify-end gap-3 border-t border-line/60 bg-muted-ui/25 px-6 py-4">
                  {footer}
                </footer>
              )}
            </m.section>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>,
    document.body,
  );
};
