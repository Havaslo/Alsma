import type { SiteLead } from "@/lib/admin/admin-api";
import {
  ADMIN_STATUS_LABELS,
  ADMIN_STATUS_TONES,
} from "@/lib/admin/admin-status";
import { cn } from "@/lib/cn";

export const AdminStatusBadge = ({
  className,
  status,
}: {
  readonly className?: string;
  readonly status: SiteLead["status"];
}) => (
  <span
    className={cn(
      "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
      ADMIN_STATUS_TONES[status],
      className,
    )}
  >
    {ADMIN_STATUS_LABELS[status]}
  </span>
);
