import { useForm, useWatch } from "react-hook-form";

import { Form } from "@/components/Form";
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
type RoleFormValues = {
  description: string;
  name: string;
  permissions: AdminPermission[];
};

export const AdminRoleEditor = ({ role }: { readonly role?: AdminRole }) => {
  const create = useCreateAdminRole();
  const update = useUpdateAdminRole();
  const form = useForm<RoleFormValues>({
    defaultValues: {
      description: role?.description ?? "",
      name: role?.name ?? "",
      permissions: role?.permissions ?? [],
    },
  });
  const permissions = useWatch({
    control: form.control,
    name: "permissions",
  });
  const toggle = (permission: AdminPermission) => {
    const current = form.getValues("permissions");
    form.setValue(
      "permissions",
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  };

  return (
    <Form
      className="mt-4 grid gap-3"
      form={form}
      onSubmit={(values) => {
        const input = {
          description: values.description || null,
          name: values.name,
          permissions: values.permissions,
        };
        if (role) update.mutate({ id: role.id, ...input });
        else create.mutate(input);
      }}
    >
      <input
        className={fieldClass}
        placeholder="Название роли"
        {...form.register("name", { required: true })}
      />
      <textarea
        className={fieldClass}
        placeholder="Описание роли"
        {...form.register("description")}
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
    </Form>
  );
};
