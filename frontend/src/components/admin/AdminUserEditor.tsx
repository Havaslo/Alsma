import { useForm, useWatch } from "react-hook-form";

import { Form } from "@/components/Form";
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
type UserFormValues = {
  displayName: string;
  email: string;
  overrides: Partial<Record<AdminPermission, boolean | null>>;
  password: string;
  roleId: string;
  status: "active" | "inactive";
};

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
  const form = useForm<UserFormValues>({
    defaultValues: {
      displayName: user?.displayName ?? "",
      email: user?.email ?? "",
      overrides: user?.permissionOverrides ?? {},
      password: "",
      roleId: user?.roleId ?? "",
      status: user?.status ?? "active",
    },
  });
  const overrides = useWatch({ control: form.control, name: "overrides" });
  const setOverride = (permission: AdminPermission, value: string) => {
    form.setValue("overrides", {
      ...form.getValues("overrides"),
      [permission]: value === "inherit" ? null : value === "allow",
    });
  };

  return (
    <Form
      className="mt-4 grid gap-3"
      form={form}
      onSubmit={(values) => {
        const input = {
          displayName: values.displayName,
          email: values.email,
          password: values.password || undefined,
          permissionOverrides: values.overrides,
          roleId: values.roleId || null,
          status: values.status,
        };
        if (user) update.mutate({ id: user.id, ...input });
        else create.mutate(input);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={fieldClass}
          placeholder="Имя сотрудника"
          {...form.register("displayName", { required: true })}
        />
        <input
          className={fieldClass}
          placeholder="Email"
          type="email"
          {...form.register("email", { required: true })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          className={fieldClass}
          placeholder={
            user ? "Новый пароль (необязательно)" : "Пароль от 8 символов"
          }
          type="password"
          {...form.register("password", {
            minLength: 8,
            required: !user,
          })}
        />
        <select className={fieldClass} {...form.register("roleId")}>
          <option value="">Без роли</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <select className={fieldClass} {...form.register("status")}>
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
    </Form>
  );
};
