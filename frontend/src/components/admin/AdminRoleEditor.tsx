import { useState } from "react";

import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
  type AdminRole,
} from "@/lib/admin/admin-settings-api";
import { ADMIN_PERMISSION_LABELS } from "@/lib/admin/admin-settings-constants";
import {
  useCreateAdminRole,
  useUpdateAdminRole,
} from "@/lib/admin/useAdminSettings";

const fieldClass = "w-full rounded-2xl border border-line bg-page px-4 py-3";
export const AdminRoleEditor = ({ role }: { readonly role?: AdminRole }) => {
  const create = useCreateAdminRole();
  const update = useUpdateAdminRole();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<AdminPermission[]>(
    role?.permissions ?? [],
  );
  const toggle = (permission: AdminPermission) =>
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const input = { description: description || null, name, permissions };
        if (role) update.mutate({ id: role.id, ...input });
        else create.mutate(input);
      }}
    >
      <input
        className={fieldClass}
        onChange={(event) => setName(event.target.value)}
        placeholder="Название роли"
        required
        value={name}
      />
      <textarea
        className={fieldClass}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Описание роли"
        value={description}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {ADMIN_PERMISSIONS.map((permission) => (
          <label
            className="flex items-center gap-2 rounded-xl bg-page p-3 text-sm"
            key={permission}
          >
            <input
              checked={permissions.includes(permission)}
              onChange={() => toggle(permission)}
              type="checkbox"
            />
            {ADMIN_PERMISSION_LABELS[permission]}
          </label>
        ))}
      </div>
      <button
        className="rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground"
        type="submit"
      >
        Сохранить роль
      </button>
    </form>
  );
};
