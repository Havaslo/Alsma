import { Button } from "@/components/ui/Button";
import type {
  AdminPermission,
  AdminRole,
} from "@/lib/admin/admin-settings-api";
import {
  ADMIN_MECHANIC_PERMISSIONS,
  ADMIN_PERMISSION_LABELS,
  ADMIN_SECTION_PERMISSIONS,
} from "@/lib/admin/admin-settings-constants";

const roleHasPermission = (
  role: AdminRole,
  permission: AdminPermission,
): boolean =>
  role.permissions.includes("*" as AdminPermission) ||
  role.permissions.includes(permission);

const PermissionBadges = ({
  permissions,
  role,
}: {
  readonly permissions: readonly AdminPermission[];
  readonly role: AdminRole;
}) => {
  const visible = permissions.filter((permission) =>
    roleHasPermission(role, permission),
  );
  if (visible.length === 0)
    return <span className="text-muted-ui-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((permission) => (
        <span
          className="rounded-full bg-muted-ui px-3 py-1 text-xs font-medium text-brand"
          key={permission}
        >
          {ADMIN_PERMISSION_LABELS[permission]}
        </span>
      ))}
    </div>
  );
};

export const AdminRolesTable = ({
  onEdit,
  roles,
}: {
  readonly onEdit: (role: AdminRole) => void;
  readonly roles: readonly AdminRole[];
}) => (
  <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
    <table className="min-w-full border-collapse text-left text-sm">
      <thead className="bg-page text-muted-ui-foreground">
        <tr>
          <th className="px-5 py-4 font-medium">Роль</th>
          <th className="px-5 py-4 font-medium">Описание</th>
          <th className="px-5 py-4 font-medium">Механики</th>
          <th className="px-5 py-4 font-medium">Разделы</th>
          <th className="px-5 py-4 text-right font-medium">Действия</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((role) => (
          <tr className="border-t border-line align-top" key={role.id}>
            <td className="px-5 py-5 font-semibold text-brand">{role.name}</td>
            <td className="max-w-56 px-5 py-5 text-muted-ui-foreground">
              {role.description || "—"}
            </td>
            <td className="min-w-72 px-5 py-5">
              <PermissionBadges
                permissions={ADMIN_MECHANIC_PERMISSIONS}
                role={role}
              />
            </td>
            <td className="min-w-96 px-5 py-5">
              <PermissionBadges
                permissions={ADMIN_SECTION_PERMISSIONS}
                role={role}
              />
            </td>
            <td className="px-5 py-5 text-right">
              <Button onClick={() => onEdit(role)} variant="secondary">
                Редактировать
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
