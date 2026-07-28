import { useState } from "react";

import { Plus } from "lucide-react";

import { AdminRoleEditor } from "@/components/admin/AdminRoleEditor";
import { AdminRolesTable } from "@/components/admin/AdminRolesTable";
import { AdminUserEditor } from "@/components/admin/AdminUserEditor";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Loader } from "@/components/ui/Loader";
import type {
  AdminRole,
  AdminSettingsUser,
} from "@/lib/admin/admin-settings-api";
import {
  useAdminSettings,
  useDeleteAdminUser,
} from "@/lib/admin/useAdminSettings";
import { cn } from "@/lib/cn";

type SettingsTab = "roles" | "users";

export const AdminSettingsPanel = ({
  currentUserId,
}: {
  readonly currentUserId: string;
}) => {
  const settings = useAdminSettings();
  const remove = useDeleteAdminUser();
  const [tab, setTab] = useState<SettingsTab>("users");
  const [roleId, setRoleId] = useState<string>();
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
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
        <section className="rounded-3xl border border-line bg-brand-foreground p-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-brand">
                Роли и доступы
              </h2>
              <p className="mt-2 text-sm text-muted-ui-foreground">
                Роли настраиваются и редактируются в модальном окне.
              </p>
            </div>
            <Button
              onClick={() => {
                setRoleId(undefined);
                setRoleEditorOpen(true);
              }}
            >
              <Plus className="size-4" />
              Добавить роль
            </Button>
          </header>
          <AdminRolesTable
            onEdit={(item: AdminRole) => {
              setRoleId(item.id);
              setRoleEditorOpen(true);
            }}
            roles={roles}
          />
        </section>
      )}

      <AdminRoleEditor
        key={role?.id ?? "new"}
        onClose={() => setRoleEditorOpen(false)}
        open={roleEditorOpen}
        role={role}
      />
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
