import { useState } from "react";

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
  const [fullName, setFullName] = useState(item.fullName ?? "");
  const [phone, setPhone] = useState(
    item.phone.startsWith("email:") ? "" : item.phone,
  );
  const [email, setEmail] = useState(item.email ?? "");
  const [balance, setBalance] = useState(item.bonusProgram?.balance ?? 0);
  return (
    <article className="grid gap-3 border-b border-line p-5 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-center">
      <input
        className="rounded-xl border border-line bg-page px-3 py-2"
        onChange={(event) => setFullName(event.target.value)}
        value={fullName}
      />
      <input
        className="rounded-xl border border-line bg-page px-3 py-2"
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Телефон"
        value={phone}
      />
      <input
        className="rounded-xl border border-line bg-page px-3 py-2"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        type="email"
        value={email}
      />
      <input
        className="w-28 rounded-xl border border-line bg-page px-3 py-2"
        min={0}
        onChange={(event) => setBalance(Number(event.target.value))}
        type="number"
        value={balance}
      />
      <div className="flex gap-2">
        <button
          className="rounded-full border border-line px-3 py-2 text-sm font-semibold text-brand"
          onClick={() => {
            update.mutate({
              email: email || null,
              fullName,
              phone: phone || null,
              recordId: item.id,
            });
            updateBonus.mutate({
              balance,
              level: item.bonusProgram?.level ?? "standard",
              recordId: item.id,
            });
          }}
          type="button"
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
    </article>
  );
};
