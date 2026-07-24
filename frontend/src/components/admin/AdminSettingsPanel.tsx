import { useState } from "react";

import { Plus } from "lucide-react";

import { AdminRoleEditor } from "@/components/admin/AdminRoleEditor";
import { AdminUserEditor } from "@/components/admin/AdminUserEditor";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Loader } from "@/components/ui/Loader";
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
  type AdminRole,
  type AdminSettingsUser,
} from "@/lib/admin/admin-settings-api";
import {
  useAdminSettings,
  useDeleteAdminUser,
} from "@/lib/admin/useAdminSettings";
import { cn } from "@/lib/cn";

type SettingsTab = "roles" | "users";

const rolePermissionCount = (role: AdminRole) =>
  role.permissions.includes("*" as AdminPermission)
    ? ADMIN_PERMISSIONS.length
    : role.permissions.length;

export const AdminSettingsPanel = ({
  currentUserId,
}: {
  readonly currentUserId: string;
}) => {
  const settings = useAdminSettings();
  const remove = useDeleteAdminUser();
  const [tab, setTab] = useState<SettingsTab>("users");
  const [roleId, setRoleId] = useState<string>();
  const [userId, setUserId] = useState<string>();
  const [userEditorOpen, setUserEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminSettingsUser>();
  const users = settings.data?.users ?? [];
  const roles = settings.data?.roles ?? [];
  const role = roles.find((item) => item.id === roleId);
  const user = users.find((item) => item.id === userId);
  const activeUsers = users.filter((item) => item.status === "active").length;

  if (settings.isLoading)
    return (
      <div className="grid place-items-center p-20">
        <Loader className="text-brand" />
      </div>
    );

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold text-brand">
          Настройки админ-панели
        </h1>
        <p className="mt-2 text-sm text-muted-ui-foreground">
          Создавайте пользователей, собирайте роли и управляйте доступами
          сотрудников.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          ["Пользователей", users.length],
          ["Ролей", roles.length],
          ["Активных пользователей", activeUsers],
        ].map(([label, value]) => (
          <article
            className="rounded-3xl border border-line bg-brand-foreground p-5"
            key={label}
          >
            <p className="text-sm text-muted-ui-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-brand">{value}</p>
          </article>
        ))}
      </section>

      <section className="border-b border-line">
        <div className="flex items-end gap-8">
          {[
            ["users", "Пользователи"],
            ["roles", "Роли и доступы"],
          ].map(([value, label]) => (
            <button
              className={cn(
                "border-b-2 pb-3 text-sm font-semibold",
                tab === value
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-ui-foreground",
              )}
              key={value}
              onClick={() => setTab(value as SettingsTab)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {tab === "users" && (
        <section className="rounded-3xl border border-line bg-brand-foreground p-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-brand">
                Пользователи админки
              </h2>
              <p className="mt-2 text-sm text-muted-ui-foreground">
                Новые пользователи и редактирование открываются в модальном
                окне.
              </p>
            </div>
            <Button
              onClick={() => {
                setUserId(undefined);
                setUserEditorOpen(true);
              }}
            >
              <Plus className="size-4" />
              Добавить пользователя
            </Button>
          </header>

          <AdminUsersTable
            currentUserId={currentUserId}
            onDelete={setDeleteTarget}
            onEdit={(item) => {
              setUserId(item.id);
              setUserEditorOpen(true);
            }}
            users={users}
          />
        </section>
      )}

      {tab === "roles" && (
        <section className="grid items-start gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
          <article className="rounded-3xl border border-line bg-brand-foreground p-6">
            <header className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold text-brand">Роли</h2>
              <Button onClick={() => setRoleId(undefined)}>
                <Plus className="size-4" />
                Новая роль
              </Button>
            </header>
            <div className="mt-5 space-y-3">
              {roles.map((item) => (
                <button
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left",
                    roleId === item.id
                      ? "border-brand bg-brand/5"
                      : "border-line bg-page",
                  )}
                  key={item.id}
                  onClick={() => setRoleId(item.id)}
                  type="button"
                >
                  <strong className="block text-brand">{item.name}</strong>
                  <span className="mt-2 block text-xs text-muted-ui-foreground">
                    {rolePermissionCount(item)} разрешений
                  </span>
                </button>
              ))}
            </div>
          </article>
          <article className="rounded-3xl border border-line bg-brand-foreground p-6">
            <h2 className="text-xl font-semibold text-brand">
              {role ? "Редактор роли" : "Новая роль"}
            </h2>
            <AdminRoleEditor key={role?.id ?? "new"} role={role} />
          </article>
        </section>
      )}

      <AdminUserEditor
        onClose={() => setUserEditorOpen(false)}
        open={userEditorOpen}
        roles={roles}
        user={user}
      />
      <ConfirmModal
        confirmLabel={remove.isPending ? "Удаление..." : "Удалить пользователя"}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={() => {
          if (!deleteTarget) return;
          remove.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(undefined),
          });
        }}
        open={Boolean(deleteTarget)}
        title="Удалить пользователя?"
      >
        Учётная запись {deleteTarget?.displayName} будет удалена. Пользователь
        потеряет доступ к админ-панели.
      </ConfirmModal>
    </div>
  );
};
