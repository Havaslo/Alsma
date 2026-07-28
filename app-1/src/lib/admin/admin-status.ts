import type { SiteLead } from "@/lib/admin/admin-api";

export const ADMIN_STATUS_LABELS: Record<SiteLead["status"], string> = {
  cancelled: "Отменена",
  completed: "Завершена",
  new: "Новая",
  processing: "В работе",
};

export const ADMIN_STATUS_TONES: Record<SiteLead["status"], string> = {
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-brand/10 text-brand",
  new: "bg-accent-ui/15 text-accent-ui-foreground",
  processing: "bg-supporting/25 text-brand",
};

export const ADMIN_STATUS_OPTIONS = (
  ["new", "processing", "completed", "cancelled"] as const
).map((value) => ({ label: ADMIN_STATUS_LABELS[value], value }));
