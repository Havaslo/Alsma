import type { ReactNode } from "react";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export const ConfirmModal = ({
  cancelLabel = "Отмена",
  children,
  confirmLabel = "Подтвердить",
  onClose,
  onConfirm,
  open,
  title,
}: {
  readonly cancelLabel?: string;
  readonly children: ReactNode;
  readonly confirmLabel?: string;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly open: boolean;
  readonly title: string;
}) => (
  <Modal
    className="max-w-lg"
    closeLabel="Закрыть окно подтверждения"
    footer={
      <>
        <Button onClick={onClose} variant="secondary">
          {cancelLabel}
        </Button>
        <Button
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </>
    }
    onClose={onClose}
    open={open}
    title={title}
  >
    <div className="flex gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </span>
      <div className="text-sm leading-6 text-muted-ui-foreground">
        {children}
      </div>
    </div>
  </Modal>
);
