import { type ReactNode, useMemo, useState } from "react";

import { AdminSiteLeadModal } from "@/components/admin/AdminSiteLeadModal";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { RequestChat } from "@/components/admin/RequestChat";
import {
  formatLeadDate,
  getLeadDetailsSummary,
  getLeadPageLabel,
} from "@/components/admin/admin-site-leads";
import { Button } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { TextField } from "@/components/ui/FormField";
import { Loader } from "@/components/ui/Loader";
import type { AdminRequest, SiteLead } from "@/lib/admin/admin-api";
import { ADMIN_STATUS_OPTIONS } from "@/lib/admin/admin-status";
import { useAdminLeads, useAdminRequests } from "@/lib/admin/useAdmin";

type FilterValue = string | "all";
const ALL_STATUS_OPTIONS = [
  { label: "Все статусы", value: "all" },
  ...ADMIN_STATUS_OPTIONS,
] as const;

export const AdminSiteLeadsTable = () => {
  const leads = useAdminLeads();
  const requests = useAdminRequests();
  const [selectedLead, setSelectedLead] = useState<SiteLead | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<FilterValue>("all");
  const [form, setForm] = useState<FilterValue>("all");
  const [status, setStatus] = useState<SiteLead["status"] | "all">("all");
  const [applied, setApplied] = useState({ form, page, search, status });
  const sourceItems = useMemo(
    () => leads.data?.items ?? [],
    [leads.data?.items],
  );
  const pageOptions = useMemo(
    () => [
      { label: "Все страницы", value: "all" },
      ...Array.from(new Set(sourceItems.map((lead) => lead.sourcePage))).map(
        (value) => ({ label: getLeadPageLabel(value), value }),
      ),
    ],
    [sourceItems],
  );
  const formOptions = useMemo(
    () => [
      { label: "Все формы", value: "all" },
      ...Array.from(
        new Map(
          sourceItems.map((lead) => [
            lead.formCode,
            { label: lead.formTitle, value: lead.formCode },
          ]),
        ).values(),
      ),
    ],
    [sourceItems],
  );
  const chatRequests = useMemo(
    () =>
      (requests.data?.items ?? [])
        .filter((request) => request.details.channelType === "chat")
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() -
            new Date(left.updatedAt).getTime(),
        ),
    [requests.data?.items],
  );
  const latestChat = chatRequests[0] ?? null;
  const chatActivity = useMemo(
    () => new Map(chatRequests.map((request) => [request.id, request])),
    [chatRequests],
  );

  const items = useMemo(() => {
    const term = applied.search.trim().toLocaleLowerCase("ru-RU");
    return sourceItems
      .filter((lead) => {
        const haystack = [
          lead.name,
          lead.phone,
          lead.email,
          lead.formTitle,
          lead.sourcePage,
          JSON.stringify(lead.details),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("ru-RU");
        return (
          (applied.status === "all" || lead.status === applied.status) &&
          (applied.page === "all" || lead.sourcePage === applied.page) &&
          (applied.form === "all" || lead.formCode === applied.form) &&
          (!term || haystack.includes(term))
        );
      })
      .sort((left, right) => {
        const leftChat = left.details.conversationId
          ? chatActivity.get(left.details.conversationId)
          : undefined;
        const rightChat = right.details.conversationId
          ? chatActivity.get(right.details.conversationId)
          : undefined;
        const leftDate =
          leftChat?.updatedAt ?? left.updatedAt ?? left.createdAt;
        const rightDate =
          rightChat?.updatedAt ?? right.updatedAt ?? right.createdAt;
        return new Date(rightDate).getTime() - new Date(leftDate).getTime();
      });
  }, [applied, chatActivity, sourceItems]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Заявки сайта</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-ui-foreground">
              Обращения из форм сайта: бронирование, SPA, трансфер и другие
              сценарии.
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

      {latestChat && (
        <section className="overflow-hidden rounded-3xl border border-brand/25 bg-brand-foreground shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-brand uppercase">
                Самое новое обращение
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {latestChat.requester ?? latestChat.contact ?? "Без имени"}
              </h2>
              <p className="mt-1 text-sm text-muted-ui-foreground">
                Обновлено{" "}
                {new Date(latestChat.updatedAt).toLocaleString("ru-RU")}
              </p>
            </div>
            <span className="rounded-full bg-accent-ui/20 px-3 py-1 text-xs font-semibold text-accent-ui-foreground">
              Новое сообщение
            </span>
          </div>
          <div className="p-5">
            <RequestChat conversationId={latestChat.id} initialMessages={[]} />
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
        <div className="grid gap-4 border-b border-line p-5 xl:grid-cols-[minmax(16rem,1fr)_14rem_16rem_14rem_auto] xl:items-end">
          <TextField
            label="Поиск"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="..."
            value={search}
          />
          <Filter label="Страница">
            <DropdownSelect
              ariaLabel="Фильтр по странице"
              onChange={setPage}
              options={pageOptions}
              triggerClassName="field-control min-h-12 text-sm"
              value={page}
            />
          </Filter>
          <Filter label="Форма">
            <DropdownSelect
              ariaLabel="Фильтр по форме"
              onChange={setForm}
              options={formOptions}
              triggerClassName="field-control min-h-12 text-sm"
              value={form}
            />
          </Filter>
          <Filter label="Статус">
            <DropdownSelect<SiteLead["status"] | "all">
              ariaLabel="Фильтр по статусу"
              onChange={setStatus}
              options={ALL_STATUS_OPTIONS}
              triggerClassName="field-control min-h-12 text-sm"
              value={status}
            />
          </Filter>
          <Button onClick={() => setApplied({ form, page, search, status })}>
            Применить
          </Button>
        </div>

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
                <tr
                  className="cursor-pointer border-t border-line align-top transition hover:bg-muted-ui/20 focus-visible:bg-muted-ui/20 focus-visible:outline-none"
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedLead(lead);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td className="px-5 py-4">
                    <strong className="block text-brand">
                      {lead.name || "Без имени"}
                    </strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      {lead.phone || lead.email || "Контакт не указан"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <strong className="block">
                      {getLeadPageLabel(lead.sourcePage)}
                    </strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      {lead.formTitle}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-ui-foreground">
                    {lead.formCode.includes("transfer")
                      ? lead.details.comment || "Указан в заявке"
                      : "—"}
                  </td>
                  <td className="max-w-md px-5 py-4 text-muted-ui-foreground">
                    {getLeadDetailsSummary(lead)}
                  </td>
                  <td className="px-5 py-4">
                    <AdminStatusBadge status={lead.status} />
                    {lead.details.conversationId &&
                      chatActivity.get(lead.details.conversationId) &&
                      (lead.status === "new" ||
                        new Date(
                          chatActivity.get(lead.details.conversationId)!
                            .updatedAt,
                        ).getTime() > new Date(lead.updatedAt).getTime()) && (
                        <span className="mt-2 inline-flex rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                          Новое сообщение
                        </span>
                      )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-muted-ui-foreground">
                    {formatLeadDate(lead.createdAt)}
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
      {selectedLead && (
        <AdminSiteLeadModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
};

const Filter = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <label>
    <span className="mb-2 block text-sm font-medium">{label}</span>
    {children}
  </label>
);
