import { useMemo, useState } from "react";

import { Search } from "lucide-react";

import { AdminClientRow } from "@/components/admin/AdminClientRow";
import { Loader } from "@/components/ui/Loader";
import { useAdminClients } from "@/lib/admin/useAdmin";

export const AdminClientsPanel = () => {
  const clients = useAdminClients();
  const [search, setSearch] = useState("");
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ru-RU");
    if (!term) return clients.data?.items ?? [];
    return (clients.data?.items ?? []).filter((item) =>
      [item.fullName, item.phone, item.email]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ru-RU")
        .includes(term),
    );
  }, [clients.data?.items, search]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <h1 className="text-3xl font-semibold">Клиенты</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-ui-foreground">
          Раздел со списком гостей, статусом входа в личный кабинет и
          количеством бронирований. Нажмите на строку управления карточкой
          клиента, чтобы открыть подробности.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_14rem]">
          <label className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
            <Search className="size-4 text-muted-ui-foreground" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-ui-foreground"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Имя, телефон или почта"
              value={search}
            />
          </label>
          <div className="rounded-2xl border border-line px-4 py-3 text-sm text-muted-ui-foreground">
            Всего клиентов:{" "}
            <strong className="text-page-foreground">
              {clients.data?.pagination.totalItems ?? 0}
            </strong>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
        <div className="overflow-x-auto">
          <table className="w-full min-w-5xl border-collapse text-left text-sm">
            <thead className="bg-page text-xs font-semibold">
              <tr>
                <th className="px-5 py-4">Имя</th>
                <th className="px-5 py-4">Телефон</th>
                <th className="px-5 py-4">Почта</th>
                <th className="px-5 py-4">Статус личного кабинета</th>
                <th className="px-5 py-4">Кол-во броней</th>
                <th className="px-5 py-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <AdminClientRow item={item} key={item.id} />
              ))}
            </tbody>
          </table>
        </div>
        {clients.isLoading && (
          <div className="grid place-items-center p-12">
            <Loader className="text-brand" />
          </div>
        )}
        {!clients.isLoading && !items.length && (
          <p className="p-12 text-center text-muted-ui-foreground">
            По выбранному запросу клиентов нет.
          </p>
        )}
      </section>
    </div>
  );
};
