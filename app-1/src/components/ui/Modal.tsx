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
  readonly backdropClassName?: string;
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
  backdropClassName,
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
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
            className={cn(
              "fixed inset-0 z-50 grid min-h-[100dvh] place-items-center overflow-y-auto overscroll-contain bg-page-foreground/35 p-2 backdrop-blur-sm in-data-[theme=dark]:bg-page/75 sm:p-4",
              backdropClassName,
            )}
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
                "relative flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-2xl border border-line/70 bg-white text-page-foreground shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl",
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
                    "flex min-w-0 items-start justify-between gap-3 border-b border-line/60 px-4 py-4 sm:items-center sm:gap-4 sm:px-6 sm:py-5",
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
                  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5",
                  hideHeader && "pt-0",
                )}
              >
                {children}
              </div>
              {footer && (
                <footer className="flex flex-wrap justify-end gap-3 border-t border-line/60 bg-muted-ui/25 px-4 py-4 sm:px-6">
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
