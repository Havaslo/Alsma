import {
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";

import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export type ModalProps = Omit<
  ComponentPropsWithoutRef<"dialog">,
  "children" | "onCancel" | "onClose" | "open"
> & {
  readonly children: ReactNode;
  readonly closeLabel?: string;
  readonly footer?: ReactNode;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly title: string;
};

export const Modal = ({
  children,
  className,
  closeLabel = "Close",
  footer,
  onClick,
  onClose,
  open,
  title,
  ...props
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog?.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    onClick?.(event);

    if (!event.defaultPrevented && event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <dialog
      aria-labelledby={titleId}
      aria-modal="true"
      className={cn(
        "m-auto max-h-screen w-11/12 max-w-2xl overflow-hidden rounded-2xl border border-line bg-panel p-0 text-panel-foreground shadow-2xl backdrop:bg-page-foreground/50",
        className,
      )}
      ref={dialogRef}
      onClick={handleClick}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      {...props}
    >
      <section className="flex max-h-screen flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
          <h2
            className="m-0 font-heading text-2xl font-semibold sm:text-4xl"
            id={titleId}
          >
            {title}
          </h2>
          <Button
            aria-label={closeLabel}
            className="size-10 shrink-0 p-0"
            title={closeLabel}
            variant="secondary"
            onClick={onClose}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-3 border-t border-line bg-muted-ui/30 px-6 py-4">
            {footer}
          </footer>
        )}
      </section>
    </dialog>
  );
};
