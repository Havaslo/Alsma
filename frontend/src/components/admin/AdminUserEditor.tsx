import { useState } from "react";

import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
  type AdminRole,
  type AdminSettingsUser,
} from "@/lib/admin/admin-settings-api";
import { ADMIN_PERMISSION_LABELS } from "@/lib/admin/admin-settings-constants";
import {
  useCreateAdminUser,
  useDeleteAdminUser,
  useUpdateAdminUser,
} from "@/lib/admin/useAdminSettings";

const fieldClass = "w-full rounded-2xl border border-line bg-page px-4 py-3";
export const AdminUserEditor = ({
  currentUserId,
  roles,
  user,
}: {
  readonly currentUserId: string;
  readonly roles: AdminRole[];
  readonly user?: AdminSettingsUser;
}) => {
  const create = useCreateAdminUser();
  const update = useUpdateAdminUser();
  const remove = useDeleteAdminUser();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(user?.roleId ?? "");
  const [status, setStatus] = useState(user?.status ?? "active");
  const [overrides, setOverrides] = useState(user?.permissionOverrides ?? {});
  const setOverride = (permission: AdminPermission, value: string) =>
    setOverrides((current) => ({
      ...current,
      [permission]: value === "inherit" ? null : value === "allow",
    }));
  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const input = {
          displayName,
          email,
          password: password || undefined,
          permissionOverrides: overrides,
          roleId: roleId || null,
          status,
        };
        if (user) update.mutate({ id: user.id, ...input });
        else create.mutate(input);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={fieldClass}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Имя сотрудника"
          required
          value={displayName}
        />
        <input
          className={fieldClass}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
          type="email"
          value={email}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          className={fieldClass}
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={
            user ? "Новый пароль (необязательно)" : "Пароль от 8 символов"
          }
          required={!user}
          type="password"
          value={password}
        />
        <select
          className={fieldClass}
          onChange={(event) => setRoleId(event.target.value)}
          value={roleId}
        >
          <option value="">Без роли</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          onChange={(event) =>
            setStatus(event.target.value as "active" | "inactive")
          }
          value={status}
        >
          <option value="active">Активен</option>
          <option value="inactive">Отключён</option>
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {ADMIN_PERMISSIONS.map((permission) => (
          <label
            className="flex items-center justify-between gap-2 rounded-xl bg-page p-3 text-sm"
            key={permission}
          >
            <span>{ADMIN_PERMISSION_LABELS[permission]}</span>
            <select
              className="rounded-lg border border-line bg-panel px-2 py-1"
              onChange={(event) => setOverride(permission, event.target.value)}
              value={
                overrides[permission] == null
                  ? "inherit"
                  : overrides[permission]
                    ? "allow"
                    : "deny"
              }
            >
              <option value="inherit">Из роли</option>
              <option value="allow">Разрешить</option>
              <option value="deny">Запретить</option>
            </select>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground"
          type="submit"
        >
          Сохранить пользователя
        </button>
        {user && user.id !== currentUserId && (
          <button
            className="rounded-full border border-line px-5 py-3 font-semibold"
            onClick={() => remove.mutate(user.id)}
            type="button"
          >
            Удалить
          </button>
        )}
      </div>
    </form>
  );
};
