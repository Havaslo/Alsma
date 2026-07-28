import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
  type AdminSettingsUser,
} from "@/lib/admin/admin-settings-api";
import { ADMIN_PERMISSION_LABELS } from "@/lib/admin/admin-settings-constants";
import { cn } from "@/lib/cn";

const effectivePermissions = (user: AdminSettingsUser) => {
  const permissions = new Set<AdminPermission>(
    user.role?.permissions.includes("*" as AdminPermission)
      ? ADMIN_PERMISSIONS
      : (user.role?.permissions ?? []),
  );
  Object.entries(user.permissionOverrides).forEach(([permission, enabled]) => {
    if (enabled === true) permissions.add(permission as AdminPermission);
    if (enabled === false) permissions.delete(permission as AdminPermission);
  });
  return [...permissions];
};

export const AdminUsersTable = ({
  currentUserId,
  onDelete,
  onEdit,
  users,
}: {
  readonly currentUserId: string;
  readonly onDelete: (user: AdminSettingsUser) => void;
  readonly onEdit: (user: AdminSettingsUser) => void;
  readonly users: readonly AdminSettingsUser[];
}) => (
  <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
    <table className="w-full min-w-4xl border-collapse text-left text-sm">
      <thead className="bg-page text-xs font-semibold text-muted-ui-foreground">
        <tr>
          <th className="px-5 py-4">Пользователь</th>
          <th className="px-5 py-4">Роль</th>
          <th className="px-5 py-4">Статус</th>
          <th className="px-5 py-4">Доступы</th>
          <th className="px-5 py-4 text-right">Действия</th>
        </tr>
      </thead>
      <tbody>
        {users.map((item) => {
          const permissions = effectivePermissions(item);
          return (
            <tr className="border-t border-line" key={item.id}>
              <td className="px-5 py-4">
                <strong className="block text-brand">
                  {item.displayName}
                  {item.id === currentUserId && (
                    <span className="ml-2 text-xs font-medium text-muted-ui-foreground">
                      Вы
                    </span>
                  )}
                </strong>
                <span className="mt-1 block text-xs text-muted-ui-foreground">
                  {item.email}
                </span>
              </td>
              <td className="px-5 py-4">{item.role?.name || "Без роли"}</td>
              <td className="px-5 py-4">
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    item.status === "active"
                      ? "bg-brand/10 text-brand"
                      : "bg-muted-ui text-muted-ui-foreground",
                  )}
                >
                  {item.status === "active" ? "Активен" : "Отключён"}
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="flex max-w-xl flex-wrap gap-2">
                  {permissions.slice(0, 3).map((permission) => (
                    <span
                      className="rounded-full bg-page px-3 py-1 text-xs text-brand"
                      key={permission}
                    >
                      {ADMIN_PERMISSION_LABELS[permission]}
                    </span>
                  ))}
                  {permissions.length > 3 && (
                    <span className="rounded-full bg-page px-3 py-1 text-xs text-muted-ui-foreground">
                      +{permissions.length - 3}
                    </span>
                  )}
                  {permissions.length === 0 && (
                    <span className="text-xs text-muted-ui-foreground">
                      Нет доступов
                    </span>
                  )}
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <Button onClick={() => onEdit(item)} variant="secondary">
                    <Pencil className="size-4" />
                    Редактировать
                  </Button>
                  {item.id !== currentUserId && (
                    <Button
                      className="text-destructive"
                      onClick={() => onDelete(item)}
                      variant="secondary"
                    >
                      <Trash2 className="size-4" />
                      Удалить
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
