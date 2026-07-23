import { useForm } from "react-hook-form";

import { Form } from "@/components/Form";
import type { AdminClient } from "@/lib/admin/admin-api";
import {
  useDeleteAdminClient,
  useUpdateAdminClient,
  useUpdateClientBonus,
} from "@/lib/admin/useAdmin";

export const AdminClientRow = ({ item }: { readonly item: AdminClient }) => {
  const update = useUpdateAdminClient();
  const remove = useDeleteAdminClient();
  const updateBonus = useUpdateClientBonus();
  const form = useForm({
    defaultValues: {
      balance: item.bonusProgram?.balance ?? 0,
      email: item.email ?? "",
      fullName: item.fullName ?? "",
      phone: item.phone.startsWith("email:") ? "" : item.phone,
    },
  });

  return (
    <Form
      className="grid gap-3 border-b border-line p-5 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-center"
      form={form}
      onSubmit={(values) => {
        update.mutate({
          email: values.email || null,
          fullName: values.fullName,
          phone: values.phone || null,
          recordId: item.id,
        });
        updateBonus.mutate({
          balance: values.balance,
          level: item.bonusProgram?.level ?? "standard",
          recordId: item.id,
        });
      }}
    >
      <input
        className="rounded-xl border border-line bg-page px-3 py-2"
        {...form.register("fullName")}
      />
      <input
        className="rounded-xl border border-line bg-page px-3 py-2"
        placeholder="Телефон"
        {...form.register("phone")}
      />
      <input
        className="rounded-xl border border-line bg-page px-3 py-2"
        placeholder="Email"
        type="email"
        {...form.register("email")}
      />
      <input
        className="w-28 rounded-xl border border-line bg-page px-3 py-2"
        min={0}
        type="number"
        {...form.register("balance", { min: 0, valueAsNumber: true })}
      />
      <div className="flex gap-2">
        <button
          className="rounded-full border border-line px-3 py-2 text-sm font-semibold text-brand"
          type="submit"
        >
          Сохранить
        </button>
        <button
          className="rounded-full border border-line px-3 py-2 text-sm"
          onClick={() => remove.mutate(item.id)}
          type="button"
        >
          Удалить
        </button>
      </div>
    </Form>
  );
};
