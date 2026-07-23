import { useState } from "react";
import { useForm } from "react-hook-form";

import { Pencil, Trash2 } from "lucide-react";

import { Form } from "@/components/Form";
import type { AdminClient } from "@/lib/admin/admin-api";
import {
  useDeleteAdminClient,
  useUpdateAdminClient,
  useUpdateClientBonus,
} from "@/lib/admin/useAdmin";

const inputClass =
  "min-w-0 rounded-xl border border-line bg-brand-foreground px-3 py-2";

export const AdminClientRow = ({ item }: { readonly item: AdminClient }) => {
  const [editing, setEditing] = useState(false);
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
    <>
      <tr className="border-t border-line align-middle">
        <td className="px-5 py-4 font-semibold">
          {item.fullName || "Без имени"}
        </td>
        <td className="px-5 py-4">{item.phone || "—"}</td>
        <td className="px-5 py-4">{item.email || "—"}</td>
        <td className="px-5 py-4">
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            Активен
          </span>
        </td>
        <td className="px-5 py-4">{item._count.bookings}</td>
        <td className="px-5 py-4 text-right">
          <div className="inline-flex gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs font-semibold text-brand"
              onClick={() => setEditing((current) => !current)}
              type="button"
            >
              <Pencil className="size-3" />
              Редактировать
            </button>
            <button
              aria-label={`Удалить клиента ${item.fullName ?? ""}`}
              className="grid size-9 place-items-center rounded-full border border-line text-destructive"
              onClick={() => remove.mutate(item.id)}
              type="button"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </td>
      </tr>
      {editing && (
        <tr className="border-t border-line">
          <td className="bg-page px-5 py-5" colSpan={6}>
            <Form
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:items-end"
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
                setEditing(false);
              }}
            >
              <label className="text-xs font-medium">
                Имя
                <input className={inputClass} {...form.register("fullName")} />
              </label>
              <label className="text-xs font-medium">
                Телефон
                <input className={inputClass} {...form.register("phone")} />
              </label>
              <label className="text-xs font-medium">
                Почта
                <input
                  className={inputClass}
                  type="email"
                  {...form.register("email")}
                />
              </label>
              <label className="text-xs font-medium">
                Бонусный баланс
                <input
                  className={inputClass}
                  min={0}
                  type="number"
                  {...form.register("balance", {
                    min: 0,
                    valueAsNumber: true,
                  })}
                />
              </label>
              <div className="flex justify-end gap-2 md:col-span-2 xl:col-span-4">
                <button
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
                  onClick={() => setEditing(false)}
                  type="button"
                >
                  Отмена
                </button>
                <button
                  className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground"
                  type="submit"
                >
                  Сохранить
                </button>
              </div>
            </Form>
          </td>
        </tr>
      )}
    </>
  );
};
