import { useMemo, useState } from "react";

import { Search } from "lucide-react";

import { AdminClientRow } from "@/components/admin/AdminClientRow";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { Loader } from "@/components/ui/Loader";
import { useAdminClients } from "@/lib/admin/useAdmin";

type ActivityFilter = "all" | "with-bookings" | "without-bookings";
const ACTIVITY_OPTIONS = [
  { label: "Все клиенты", value: "all" },
  { label: "Есть покупки", value: "with-bookings" },
  { label: "Без покупок", value: "without-bookings" },
] as const;

export const AdminClientsPanel = () => {
  const clients = useAdminClients();
  const [search, setSearch] = useState("");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ru-RU");
    return (clients.data?.items ?? []).filter((item) => {
      const matchesSearch =
        !term ||
        [item.fullName, item.phone, item.email]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("ru-RU")
          .includes(term);
      const matchesActivity =
        activity === "all" ||
        (activity === "with-bookings" && item._count.serviceOrders > 0) ||
        (activity === "without-bookings" && item._count.serviceOrders === 0);
      return matchesSearch && matchesActivity;
    });
  }, [activity, clients.data?.items, search]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <h1 className="text-3xl font-semibold">Клиенты</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-ui-foreground">
          Раздел со списком гостей, источником данных, покупками услуг и бронями
          номеров. Нажмите на строку клиента, чтобы открыть подробности.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_14rem]">
          <label>
            <span className="mb-2 block text-sm font-medium text-muted-ui-foreground">
              Поиск
            </span>
            <span className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-page px-4">
              <Search className="size-4 text-muted-ui-foreground" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-ui-foreground"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="..."
                value={search}
              />
            </span>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-muted-ui-foreground">
              Активность
            </span>
            <DropdownSelect<ActivityFilter>
              ariaLabel="Фильтр клиентов по активности"
              onChange={setActivity}
              options={ACTIVITY_OPTIONS}
              triggerClassName="min-h-12 rounded-2xl border border-line bg-page px-4 text-sm"
              value={activity}
            />
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
        <div className="border-b border-line px-5 py-4 text-sm font-semibold">
          Всего клиентов: {items.length}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-5xl border-collapse text-left text-sm">
            <thead className="bg-page text-xs font-semibold">
              <tr>
                <th className="px-5 py-4">Имя</th>
                <th className="px-5 py-4">Телефон</th>
                <th className="px-5 py-4">Почта</th>
                <th className="px-5 py-4">Источник</th>
                <th className="px-5 py-4">Покупок услуг</th>
                <th className="px-5 py-4">Брони и даты</th>
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
