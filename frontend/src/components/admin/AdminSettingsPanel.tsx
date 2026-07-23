import { useState } from "react";

import { CirclePlus, Pencil } from "lucide-react";

import { AdminRoleEditor } from "@/components/admin/AdminRoleEditor";
import { AdminUserEditor } from "@/components/admin/AdminUserEditor";
import { Loader } from "@/components/ui/Loader";
import { useAdminSettings } from "@/lib/admin/useAdminSettings";

export const AdminSettingsPanel = ({
  currentUserId,
}: {
  readonly currentUserId: string;
}) => {
  const settings = useAdminSettings();
  const [tab, setTab] = useState<"roles" | "users">("users");
  const [roleId, setRoleId] = useState<string>();
  const [userId, setUserId] = useState<string>();
  const [editorOpen, setEditorOpen] = useState(false);
  const role = settings.data?.roles.find((item) => item.id === roleId);
  const user = settings.data?.users.find((item) => item.id === userId);
  const users = settings.data?.users ?? [];
  const roles = settings.data?.roles ?? [];
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
              className={`border-b-2 pb-3 text-sm font-semibold ${
                tab === value
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-ui-foreground"
              }`}
              key={value}
              onClick={() => {
                setTab(value as "roles" | "users");
                setEditorOpen(false);
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {tab === "users" && (
        <section className="rounded-3xl border border-line bg-brand-foreground p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-brand">
                Пользователи админки
              </h2>
              <p className="mt-2 text-sm text-muted-ui-foreground">
                Новые пользователи и редактирование открываются в модальном окне
                редактора.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground"
              onClick={() => {
                setUserId(undefined);
                setEditorOpen(true);
              }}
              type="button"
            >
              <CirclePlus className="size-4" />
              Добавить пользователя
            </button>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-4xl border-collapse text-left text-sm">
              <thead className="bg-page text-xs font-semibold">
                <tr>
                  <th className="px-5 py-4">Пользователь</th>
                  <th className="px-5 py-4">Роль</th>
                  <th className="px-5 py-4">Статус</th>
                  <th className="px-5 py-4">Доступы</th>
                  <th className="px-5 py-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr className="border-t border-line" key={item.id}>
                    <td className="px-5 py-4">
                      <strong className="block">{item.displayName}</strong>
                      <span className="mt-1 block text-xs text-muted-ui-foreground">
                        {item.email}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {item.role?.name || "Без роли"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                        {item.status === "active" ? "Активен" : "Отключён"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-ui-foreground">
                      {item.role?.permissions.length ?? 0} разрешений
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs font-semibold text-brand"
                        onClick={() => {
                          setUserId(item.id);
                          setEditorOpen(true);
                        }}
                        type="button"
                      >
                        <Pencil className="size-3" />
                        Редактировать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editorOpen && (
            <div className="mt-6 rounded-3xl border border-line bg-page p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-brand">
                  {user ? "Редактирование пользователя" : "Новый пользователь"}
                </h3>
                <button
                  className="text-sm font-semibold text-muted-ui-foreground"
                  onClick={() => setEditorOpen(false)}
                  type="button"
                >
                  Закрыть
                </button>
              </div>
              <AdminUserEditor
                currentUserId={currentUserId}
                key={user?.id ?? "new"}
                roles={roles}
                user={user}
              />
            </div>
          )}
        </section>
      )}

      {tab === "roles" && (
        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-3xl border border-line bg-brand-foreground p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold text-brand">Роли</h2>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground"
                onClick={() => {
                  setRoleId(undefined);
                  setEditorOpen(true);
                }}
                type="button"
              >
                <CirclePlus className="size-4" />
                Новая роль
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {roles.map((item) => (
                <button
                  className={`w-full rounded-2xl border p-4 text-left ${
                    roleId === item.id
                      ? "border-brand bg-brand/5"
                      : "border-line bg-page"
                  }`}
                  key={item.id}
                  onClick={() => {
                    setRoleId(item.id);
                    setEditorOpen(true);
                  }}
                  type="button"
                >
                  <strong className="block">{item.name}</strong>
                  <span className="mt-2 block text-xs text-muted-ui-foreground">
                    {item.permissions.length} разрешений
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
    </div>
  );
};
