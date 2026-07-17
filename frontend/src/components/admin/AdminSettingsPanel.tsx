import { useState } from "react";

import { CirclePlus, Settings2 } from "lucide-react";

import { AdminRoleEditor } from "@/components/admin/AdminRoleEditor";
import { AdminUserEditor } from "@/components/admin/AdminUserEditor";
import { useAdminSettings } from "@/lib/admin/useAdminSettings";

export const AdminSettingsPanel = ({
  currentUserId,
}: {
  readonly currentUserId: string;
}) => {
  const settings = useAdminSettings();
  const [roleId, setRoleId] = useState<string>();
  const [userId, setUserId] = useState<string>();
  const role = settings.data?.roles.find((item) => item.id === roleId);
  const user = settings.data?.users.find((item) => item.id === userId);
  return (
    <section className="mt-8 rounded-3xl border border-line bg-panel p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-brand">
        <Settings2 className="size-4" /> Настройки доступа
      </p>
      <h2 className="mt-1 font-heading text-3xl font-semibold">
        Пользователи и роли
      </h2>
      <div className="mt-6 grid gap-8 xl:grid-cols-2">
        <div>
          <header className="flex justify-between">
            <h3 className="text-xl font-semibold">Роли</h3>
            <button
              className="flex items-center gap-1 text-brand"
              onClick={() => setRoleId(undefined)}
              type="button"
            >
              <CirclePlus className="size-4" /> Новая
            </button>
          </header>
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.data?.roles.map((item) => (
              <button
                className="rounded-full bg-brand/10 px-3 py-2 text-sm text-brand"
                key={item.id}
                onClick={() => setRoleId(item.id)}
                type="button"
              >
                {item.name}
              </button>
            ))}
          </div>
          <AdminRoleEditor key={role?.id ?? "new"} role={role} />
        </div>
        <div>
          <header className="flex justify-between">
            <h3 className="text-xl font-semibold">Сотрудники</h3>
            <button
              className="flex items-center gap-1 text-brand"
              onClick={() => setUserId(undefined)}
              type="button"
            >
              <CirclePlus className="size-4" /> Новый
            </button>
          </header>
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.data?.users.map((item) => (
              <button
                className="rounded-full bg-brand/10 px-3 py-2 text-sm text-brand"
                key={item.id}
                onClick={() => setUserId(item.id)}
                type="button"
              >
                {item.displayName}
              </button>
            ))}
          </div>
          <AdminUserEditor
            currentUserId={currentUserId}
            key={user?.id ?? "new"}
            roles={settings.data?.roles ?? []}
            user={user}
          />
        </div>
      </div>
    </section>
  );
};
