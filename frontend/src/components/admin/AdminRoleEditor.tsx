import { useId } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { CheckboxField, TextField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
  type AdminRole,
} from "@/lib/admin/admin-settings-api";
import {
  ADMIN_MECHANIC_PERMISSIONS,
  ADMIN_PERMISSION_LABELS,
  ADMIN_SECTION_PERMISSIONS,
} from "@/lib/admin/admin-settings-constants";
import {
  useCreateAdminRole,
  useUpdateAdminRole,
} from "@/lib/admin/useAdminSettings";

type RoleFormValues = {
  description: string;
  name: string;
  permissions: AdminPermission[];
};

const PermissionGroup = ({
  permissions,
  selected,
  title,
  toggle,
}: {
  readonly permissions: readonly AdminPermission[];
  readonly selected: readonly AdminPermission[];
  readonly title: string;
  readonly toggle: (permission: AdminPermission, checked: boolean) => void;
}) => (
  <section className="rounded-2xl border border-line bg-page p-5">
    <h3 className="text-base font-semibold text-brand">{title}</h3>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {permissions.map((permission) => (
        <CheckboxField
          checked={selected.includes(permission)}
          className="w-full"
          key={permission}
          label={ADMIN_PERMISSION_LABELS[permission]}
          onChange={(checked) => toggle(permission, checked)}
        />
      ))}
    </div>
  </section>
);

export const AdminRoleEditor = ({
  onClose,
  open,
  role,
}: {
  readonly onClose: () => void;
  readonly open: boolean;
  readonly role?: AdminRole;
}) => {
  const create = useCreateAdminRole();
  const update = useUpdateAdminRole();
  const formId = useId();
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
        ? [...new Set([...current, permission])]
        : current.filter((item) => item !== permission),
      { shouldDirty: true },
    );
  };

  return (
    <Modal
      className="max-w-5xl"
      closeLabel="Закрыть редактор роли"
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Отмена
          </Button>
          <Button disabled={pending} form={formId} type="submit">
            {pending
              ? "Сохранение..."
              : role
                ? "Сохранить роль"
                : "Создать роль"}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title={role ? "Редактирование роли" : "Создание роли"}
    >
      <p className="mb-6 text-sm leading-6 text-muted-ui-foreground">
        Соберите точный набор разделов и механик для выбранной роли.
      </p>
      <Form
        className="space-y-6"
        form={form}
        id={formId}
        onSubmit={(values) => {
          const input = {
            description: values.description || null,
            name: values.name,
            permissions: values.permissions,
          };
          if (role)
            update.mutate({ id: role.id, ...input }, { onSuccess: onClose });
          else create.mutate(input, { onSuccess: onClose });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            error={form.formState.errors.name?.message}
            label="Название роли"
            placeholder="..."
            {...form.register("name", { required: "Укажите название" })}
          />
          <TextField
            label="Краткое описание"
            placeholder="..."
            {...form.register("description")}
          />
        </div>
        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          <PermissionGroup
            permissions={ADMIN_SECTION_PERMISSIONS}
            selected={permissions}
            title="Доступ к разделам"
            toggle={toggle}
          />
          <PermissionGroup
            permissions={ADMIN_MECHANIC_PERMISSIONS}
            selected={permissions}
            title="Доступные механики"
            toggle={toggle}
          />
        </div>
      </Form>
    </Modal>
  );
};
