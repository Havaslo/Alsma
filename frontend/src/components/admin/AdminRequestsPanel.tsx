import { useMemo, useState } from "react";

import { ExternalLink, Search } from "lucide-react";

import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { Loader } from "@/components/ui/Loader";
import type { SiteLead } from "@/lib/admin/admin-api";
import { ADMIN_STATUS_OPTIONS } from "@/lib/admin/admin-status";
import { useAdminRequests, useUpdateAdminRequest } from "@/lib/admin/useAdmin";

const allStatusOptions = [
  { label: "Все статусы", value: "all" },
  ...ADMIN_STATUS_OPTIONS,
] as const;

export const AdminRequestsPanel = () => {
  const requests = useAdminRequests();
  const update = useUpdateAdminRequest();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SiteLead["status"] | "all">("all");
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ru-RU");
    return (requests.data?.items ?? []).filter((item) => {
      const matchesStatus = status === "all" || item.status === status;
      const haystack = [item.category, item.contact, item.requester, item.title]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ru-RU");
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [requests.data?.items, search, status]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-brand-foreground p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_14rem_12rem]">
          <label className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
            <Search className="size-4 text-muted-ui-foreground" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-ui-foreground"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Телефон, намерение, результат"
              value={search}
            />
          </label>
          <DropdownSelect<SiteLead["status"] | "all">
            ariaLabel="Фильтр обращений по статусу"
            onChange={setStatus}
            options={allStatusOptions}
            triggerClassName="h-full rounded-2xl border border-line px-4 py-3 text-sm"
            value={status}
          />
          <div className="rounded-2xl border border-line px-4 py-3 text-sm text-muted-ui-foreground">
            Всего обращений:{" "}
            <strong className="text-page-foreground">
              {requests.data?.pagination.totalItems ?? 0}
            </strong>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
        <div className="overflow-x-auto">
          <table className="w-full min-w-6xl border-collapse text-left text-sm">
            <thead className="bg-page text-xs font-semibold">
              <tr>
                <th className="px-5 py-4">Источник</th>
                <th className="px-5 py-4">Дата</th>
                <th className="px-5 py-4">Клиент</th>
                <th className="px-5 py-4">Намерение</th>
                <th className="px-5 py-4">Статус</th>
                <th className="px-5 py-4">Результат</th>
                <th className="px-5 py-4 text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="border-t border-line align-top" key={item.id}>
                  <td className="px-5 py-4">
                    <strong className="block">{item.category}</strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      Канал обращения
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-ui-foreground">—</td>
                  <td className="px-5 py-4">
                    <strong className="block">
                      {item.requester || "Без имени"}
                    </strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      {item.contact || "Контакт не указан"}
                    </span>
                  </td>
                  <td className="px-5 py-4">{item.title}</td>
                  <td className="w-40 px-5 py-4">
                    <AdminStatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-4 text-muted-ui-foreground">
                    {item.status === "completed"
                      ? "Обращение обработано"
                      : "Ожидает следующего действия"}
                  </td>
                  <td className="w-48 px-5 py-4 text-right">
                    <DropdownSelect<SiteLead["status"]>
                      ariaLabel={`Изменить статус обращения ${item.title}`}
                      menuPlacement="top"
                      onChange={(nextStatus) =>
                        update.mutate({
                          recordId: item.id,
                          status: nextStatus,
                        })
                      }
                      options={ADMIN_STATUS_OPTIONS}
                      triggerClassName="rounded-full border border-line px-4 py-2 text-xs"
                      value={item.status}
                    />
                    <button
                      className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-brand"
                      type="button"
                    >
                      <ExternalLink className="size-3" />
                      Открыть
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {requests.isLoading && (
          <div className="grid place-items-center p-12">
            <Loader className="text-brand" />
          </div>
        )}
        {!requests.isLoading && !items.length && (
          <p className="p-12 text-center text-muted-ui-foreground">
            По выбранным фильтрам обращений нет.
          </p>
        )}
      </section>
    </div>
  );
};
