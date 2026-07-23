import { useMemo, useState } from "react";

import { Search } from "lucide-react";

import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { Loader } from "@/components/ui/Loader";
import type { SiteLead } from "@/lib/admin/admin-api";
import { ADMIN_STATUS_OPTIONS } from "@/lib/admin/admin-status";
import { useAdminLeads, useUpdateAdminLead } from "@/lib/admin/useAdmin";

const allStatusOptions = [
  { label: "Все статусы", value: "all" },
  ...ADMIN_STATUS_OPTIONS,
] as const;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));

export const AdminSiteLeadsTable = () => {
  const leads = useAdminLeads();
  const update = useUpdateAdminLead();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SiteLead["status"] | "all">("all");
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ru-RU");
    return (leads.data?.items ?? []).filter((lead) => {
      const matchesStatus = status === "all" || lead.status === status;
      const haystack = [
        lead.name,
        lead.phone,
        lead.email,
        lead.formTitle,
        JSON.stringify(lead.details),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ru-RU");
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [leads.data?.items, search, status]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Заявки сайта</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-ui-foreground">
              Все обращения, отправленные с форм сайта: бронирование, SPA,
              трансфер и другие сценарии.
            </p>
          </div>
          <span className="text-sm text-muted-ui-foreground">
            Всего заявок:{" "}
            <strong className="text-page-foreground">
              {leads.data?.pagination.totalItems ?? 0}
            </strong>
          </span>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-brand-foreground p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_14rem_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
            <Search className="size-4 text-muted-ui-foreground" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-ui-foreground"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Имя, телефон, почта, детали"
              value={search}
            />
          </label>
          <DropdownSelect<SiteLead["status"] | "all">
            ariaLabel="Фильтр по статусу"
            onChange={setStatus}
            options={allStatusOptions}
            triggerClassName="h-full rounded-2xl border border-line px-4 py-3 text-sm"
            value={status}
          />
          <button
            className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground"
            onClick={() => {
              setSearch("");
              setStatus("all");
            }}
            type="button"
          >
            Сбросить
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
        <div className="overflow-x-auto">
          <table className="w-full min-w-6xl border-collapse text-left text-sm">
            <thead className="bg-page text-xs font-semibold">
              <tr>
                <th className="px-5 py-4">Гость</th>
                <th className="px-5 py-4">Источник</th>
                <th className="px-5 py-4">Трансфер</th>
                <th className="px-5 py-4">Детали</th>
                <th className="px-5 py-4">Статус</th>
                <th className="px-5 py-4">Создано</th>
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => (
                <tr className="border-t border-line align-top" key={lead.id}>
                  <td className="px-5 py-4">
                    <strong className="block">
                      {lead.name || "Без имени"}
                    </strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      {lead.phone || lead.email || "Контакт не указан"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <strong className="block">{lead.formTitle}</strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      Форма сайта
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-ui-foreground">
                    {lead.formTitle
                      .toLocaleLowerCase("ru-RU")
                      .includes("трансфер")
                      ? "Указан в заявке"
                      : "—"}
                  </td>
                  <td className="px-5 py-4 text-muted-ui-foreground">
                    {lead.details.checkInDate
                      ? `${lead.details.checkInDate} — ${lead.details.checkOutDate}, ${lead.details.guestsCount ?? "—"} гост.`
                      : "Заявка отправлена без дополнительных параметров"}
                  </td>
                  <td className="w-44 px-5 py-4">
                    <DropdownSelect<SiteLead["status"]>
                      ariaLabel={`Статус заявки ${lead.formTitle}`}
                      onChange={(nextStatus) =>
                        update.mutate({ leadId: lead.id, status: nextStatus })
                      }
                      options={ADMIN_STATUS_OPTIONS}
                      triggerClassName="rounded-xl px-0 py-0 text-xs"
                      value={lead.status}
                    />
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-muted-ui-foreground">
                    {formatDate(lead.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leads.isLoading && (
          <div className="grid place-items-center p-12">
            <Loader className="text-brand" />
          </div>
        )}
        {!leads.isLoading && !items.length && (
          <p className="p-12 text-center text-muted-ui-foreground">
            По выбранным фильтрам заявок нет.
          </p>
        )}
      </section>
    </div>
  );
};
