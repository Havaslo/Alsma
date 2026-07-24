import { useForm, useWatch } from "react-hook-form";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "@/components/ui/FormField";
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

type RoleFormValues = {
  description: string;
  name: string;
  permissions: AdminPermission[];
};

export const AdminRoleEditor = ({ role }: { readonly role?: AdminRole }) => {
  const create = useCreateAdminRole();
  const update = useUpdateAdminRole();
  const form = useForm<RoleFormValues>({
    values: {
      description: role?.description ?? "",
      name: role?.name ?? "",
      permissions: role?.permissions.includes("*" as AdminPermission)
        ? [...ADMIN_PERMISSIONS]
        : (role?.permissions ?? []),
    },
  });
  const permissions =
    useWatch({ control: form.control, name: "permissions" }) ?? [];
  const pending = create.isPending || update.isPending;
  const toggle = (permission: AdminPermission, checked: boolean) => {
    const current = form.getValues("permissions");
    form.setValue(
      "permissions",
      checked
        ? [...current, permission]
        : current.filter((item) => item !== permission),
      { shouldDirty: true },
    );
  };

  return (
    <Form
      className="mt-5 space-y-5"
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
      <TextField
        error={form.formState.errors.name?.message}
        label="Название роли"
        placeholder="..."
        {...form.register("name", { required: "Укажите название" })}
      />
      <TextAreaField
        label="Описание роли"
        placeholder="..."
        rows={3}
        {...form.register("description")}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {ADMIN_PERMISSIONS.map((permission) => (
          <CheckboxField
            checked={permissions.includes(permission)}
            className="w-full"
            key={permission}
            label={ADMIN_PERMISSION_LABELS[permission]}
            onChange={(checked) => toggle(permission, checked)}
          />
        ))}
      </div>
      <Button disabled={pending} type="submit">
        {pending ? "Сохранение..." : "Сохранить роль"}
      </Button>
    </Form>
  );
};
