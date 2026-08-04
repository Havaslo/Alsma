import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

export type TableActionsProps = {
  readonly itemLabel: string;
  readonly onDelete: () => void;
  readonly onEdit: () => void;
};

export const TableActions = ({
  itemLabel,
  onDelete,
  onEdit,
}: TableActionsProps) => {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        aria-label={`Edit ${itemLabel}`}
        className="size-9 min-h-0 rounded-lg p-0"
        onClick={onEdit}
        title={`Edit ${itemLabel}`}
        variant="secondary"
      >
        <Pencil aria-hidden="true" className="size-4" />
      </Button>
      <Button
        aria-label={`Delete ${itemLabel}`}
        className="size-9 min-h-0 rounded-lg border-danger/20 p-0 text-danger hover:border-danger/30 hover:bg-danger/10"
        onClick={onDelete}
        title={`Delete ${itemLabel}`}
        variant="secondary"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
};
