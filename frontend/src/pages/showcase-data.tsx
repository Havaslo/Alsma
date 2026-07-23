import {
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type {
  AutoFilterField,
  AutoFilterValues,
} from "@/components/AutoFilter";
import type { ChatMessage } from "@/components/chat/chat-types";
import type { TableColumn } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";

export const formSchema = z.object({
  email: z.email("Enter a valid email address."),
  name: z.string().trim().min(2, "Enter at least two characters."),
  notes: z.string().trim().max(240, "Keep notes under 240 characters."),
  password: z.string().min(8, "Use at least eight characters."),
  plan: z.enum(["starter", "team", "scale"]),
  role: z.enum(["designer", "developer", "founder"]),
  updates: z.boolean(),
  visible: z.boolean(),
});

export type FormValues = z.infer<typeof formSchema>;

type ProjectRow = {
  readonly name: string;
  readonly owner: string;
  readonly status: string;
};

// prettier-ignore
export const roleOptions = [{ label: "Designer", value: "designer" }, { label: "Developer", value: "developer" }, { label: "Founder", value: "founder" }] as const;
// prettier-ignore
export const planOptions = [{ label: "Starter", value: "starter" }, { label: "Team", value: "team" }, { label: "Scale", value: "scale" }] as const;
export const projectActions = ["Duplicate project", "Archive project"] as const;
export const filterFields: readonly AutoFilterField[] = [
  { key: "query", label: "Project", type: "text" },
  {
    key: "status",
    label: "Status",
    options: [
      { label: "All statuses", value: "all" },
      { label: "Live", value: "live" },
      { label: "Review", value: "review" },
      { label: "Draft", value: "draft" },
    ],
    type: "select",
  },
];
export const initialFilterValues: AutoFilterValues = {
  query: "",
  status: "all",
};
export const projects: readonly ProjectRow[] = [
  { name: "Atlas", owner: "Maya", status: "Live" },
  { name: "Northstar", owner: "Theo", status: "Review" },
  { name: "Canvas", owner: "Noor", status: "Draft" },
];
export const projectColumns: readonly TableColumn<ProjectRow>[] = [
  { header: "Project", key: "name", render: (row) => row.name },
  { header: "Owner", key: "owner", render: (row) => row.owner },
  {
    header: "Status",
    key: "status",
    render: (row) => (
      <span className="rounded-full bg-muted-ui px-3 py-1 text-xs font-semibold text-muted-ui-foreground">
        {row.status}
      </span>
    ),
  },
  {
    header: <span className="sr-only">Actions</span>,
    key: "actions",
    render: (row) => (
      <TableActions
        itemLabel={row.name}
        onDelete={() => toast.success(`${row.name} deleted`)}
        onEdit={() => toast.info(`Editing ${row.name}`)}
      />
    ),
  },
];
export const initialMessages: readonly ChatMessage[] = [
  {
    content: "What would you like to build today?",
    id: "welcome",
    role: "assistant",
  },
];
export const mapCenter: [number, number] = [51.505, -0.09];
export const mapMarkers = [{ label: "Project location", position: mapCenter }];
export const navigationItems = [
  { href: "#forms", icon: LayoutDashboard, label: "Forms" },
  { href: "#controls", icon: SlidersHorizontal, label: "Controls" },
  { href: "#media", icon: CalendarDays, label: "Media" },
  { href: "#chat", icon: MessageSquare, label: "Chat" },
] as const;
