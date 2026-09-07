import { ConfirmModal } from "@/components/ui/ConfirmModal";

type Props = {
  open: boolean;
  name?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export const AdminServiceDeleteDialog = ({
  open,
  name,
  onClose,
  onConfirm,
}: Props) => (
  <ConfirmModal
    confirmLabel="Удалить"
    onClose={onClose}
    onConfirm={onConfirm}
    open={open}
    title="Удалить карточку?"
  >
    <p>Карточка «{name}» будет удалена вместе с вариантами.</p>
  </ConfirmModal>
);
