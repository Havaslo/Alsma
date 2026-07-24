import { useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { CheckboxField, TextField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
  type AdminRole,
  type AdminSettingsUser,
} from "@/lib/admin/admin-settings-api";
import { ADMIN_PERMISSION_LABELS } from "@/lib/admin/admin-settings-constants";
import {
  useCreateAdminUser,
  useUpdateAdminUser,
} from "@/lib/admin/useAdminSettings";

type UserFormValues = {
  displayName: string;
  email: string;
  overrides: Partial<Record<AdminPermission, boolean | null>>;
  password: string;
  roleId: string;
  status: "active" | "inactive";
};

const OVERRIDE_OPTIONS = [
  { label: "Наследовать", value: "inherit" },
  { label: "Включить", value: "allow" },
  { label: "Выключить", value: "deny" },
] as const;

const permissionValue = (
  value: boolean | null | undefined,
): (typeof OVERRIDE_OPTIONS)[number]["value"] =>
  value == null ? "inherit" : value ? "allow" : "deny";

export const AdminUserEditor = ({
  onClose,
  open,
  roles,
  user,
}: {
  readonly onClose: () => void;
  readonly open: boolean;
  readonly roles: AdminRole[];
  readonly user?: AdminSettingsUser;
}) => {
  const create = useCreateAdminUser();
  const update = useUpdateAdminUser();
  const formId = useId();
  const form = useForm<UserFormValues>({
    values: {
      displayName: user?.displayName ?? "",
      email: user?.email ?? "",
      overrides: user?.permissionOverrides ?? {},
      password: "",
      roleId: user?.roleId ?? "",
      status: user?.status ?? "active",
    },
  });
  const overrides =
    useWatch({ control: form.control, name: "overrides" }) ?? {};
  const status = useWatch({ control: form.control, name: "status" });
  const pending = create.isPending || update.isPending;
  const roleOptions = [
    { label: "Без роли", value: "" },
    ...roles.map((role) => ({ label: role.name, value: role.id })),
  ];

  const setOverride = (
    permission: AdminPermission,
    value: (typeof OVERRIDE_OPTIONS)[number]["value"],
  ) => {
    form.setValue(
      "overrides",
      {
        ...form.getValues("overrides"),
        [permission]: value === "inherit" ? null : value === "allow",
      },
      { shouldDirty: true },
    );
  };

  return (
    <Modal
      className="max-w-6xl"
      closeLabel="Закрыть редактор пользователя"
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Отмена
          </Button>
          <Button disabled={pending} form={formId} type="submit">
            {pending
              ? "Сохранение..."
              : user
                ? "Сохранить пользователя"
                : "Создать пользователя"}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title={user ? "Редактирование пользователя" : "Создание пользователя"}
    >
      <p className="mb-6 text-sm leading-6 text-muted-ui-foreground">
        Задайте сотруднику данные для входа, роль и при необходимости
        индивидуальные права поверх роли.
      </p>
      <Form
        className="space-y-6"
        form={form}
        id={formId}
        onSubmit={(values) => {
          const input = {
            displayName: values.displayName,
            email: values.email,
            password: values.password || undefined,
            permissionOverrides: values.overrides,
            roleId: values.roleId || null,
            status: values.status,
          };
          if (user) {
            update.mutate({ id: user.id, ...input }, { onSuccess: onClose });
          } else {
            create.mutate(input, { onSuccess: onClose });
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            error={form.formState.errors.displayName?.message}
            label="Имя и фамилия"
            placeholder="..."
            {...form.register("displayName", {
              minLength: { message: "Минимум 2 символа", value: 2 },
              required: "Укажите имя",
            })}
          />
          <TextField
            error={form.formState.errors.email?.message}
            label="Email для входа"
            placeholder="..."
            type="email"
            {...form.register("email", { required: "Укажите email" })}
          />
        </div>
        <TextField
          error={form.formState.errors.password?.message}
          label={user ? "Новый пароль" : "Пароль"}
          placeholder="..."
          type="password"
          {...form.register("password", {
            minLength: { message: "Минимум 8 символов", value: 8 },
            required: user ? false : "Укажите пароль",
          })}
        />
        {user && (
          <p className="-mt-4 text-xs text-muted-ui-foreground">
            Оставьте поле пустым, чтобы сохранить текущий пароль.
          </p>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
          <section className="space-y-5 rounded-2xl border border-line bg-page p-5">
            <h3 className="text-base font-semibold text-brand">
              Статус и роль
            </h3>
            <label className="block text-sm font-medium">
              <span>Роль</span>
              <span className="mt-2 block rounded-xl border border-line bg-brand-foreground px-4 py-2.5">
                <Controller
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <DropdownSelect
                      ariaLabel="Роль пользователя"
                      onChange={field.onChange}
                      options={roleOptions}
                      value={field.value}
                    />
                  )}
                />
              </span>
            </label>
            <CheckboxField
              checked={status === "active"}
              className="w-full"
              label="Пользователь активен и может входить в админку"
              onChange={(checked) =>
                form.setValue("status", checked ? "active" : "inactive", {
                  shouldDirty: true,
                })
              }
            />
          </section>

          <section className="rounded-2xl border border-line bg-page p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-brand">
                  Персональные права поверх роли
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
                  Оставьте «Наследовать», если нужен набор прав из выбранной
                  роли.
                </p>
              </div>
              <Button
                onClick={() =>
                  form.setValue("overrides", {}, { shouldDirty: true })
                }
                variant="secondary"
              >
                Сбросить
              </Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ADMIN_PERMISSIONS.map((permission) => {
                const selected = permissionValue(overrides[permission]);
                return (
                  <article
                    className="rounded-2xl border border-line bg-brand-foreground p-4"
                    key={permission}
                  >
                    <h4 className="min-h-10 text-sm font-semibold text-brand">
                      {ADMIN_PERMISSION_LABELS[permission]}
                    </h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {OVERRIDE_OPTIONS.map((option) => (
                        <Button
                          className="min-h-9 px-3 py-1.5 text-xs"
                          key={option.value}
                          onClick={() => setOverride(permission, option.value)}
                          variant={
                            selected === option.value ? "primary" : "secondary"
                          }
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </Form>
    </Modal>
  );
};
