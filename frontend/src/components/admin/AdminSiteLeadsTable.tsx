import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { Loader } from "@/components/ui/Loader";
import type { SiteLead } from "@/lib/admin/admin-api";
import { useAdminLeads, useUpdateAdminLead } from "@/lib/admin/useAdmin";

const statusOptions = [
  { label: "Новая", value: "new" },
  { label: "В работе", value: "processing" },
  { label: "Завершена", value: "completed" },
  { label: "Отменена", value: "cancelled" },
] as const;

export const AdminSiteLeadsTable = () => {
  const leads = useAdminLeads();
  const update = useUpdateAdminLead();

  return (
    <section>
      <div>
        <h1 className="text-4xl font-semibold">Заявки сайта</h1>
        <p className="mt-3 max-w-3xl text-muted-ui-foreground">
          Все обращения из форм сайта: бронирование, трансфер, корпоративные
          заезды и консультации.
        </p>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          ["Всего заявок", leads.data?.pagination.totalItems ?? 0],
          [
            "Новые",
            leads.data?.items.filter((item) => item.status === "new").length ??
              0,
          ],
          [
            "В работе",
            leads.data?.items.filter((item) => item.status === "processing")
              .length ?? 0,
          ],
        ].map(([label, value]) => (
          <article
            className="rounded-3xl border border-line bg-brand-foreground p-5"
            key={label}
          >
            <p className="text-sm text-muted-ui-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-brand">{value}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-brand-foreground">
        <div className="overflow-x-auto">
          <table className="w-full min-w-4xl border-collapse text-left text-sm">
            <thead className="bg-muted-ui/35 text-muted-ui-foreground">
              <tr>
                <th className="px-5 py-4">Дата</th>
                <th className="px-5 py-4">Форма</th>
                <th className="px-5 py-4">Контакт</th>
                <th className="px-5 py-4">Детали</th>
                <th className="px-5 py-4">Статус</th>
              </tr>
            </thead>
            <tbody>
              {leads.data?.items.map((lead) => (
                <tr className="border-t border-line" key={lead.id}>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {new Date(lead.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-5 py-4 font-medium">{lead.formTitle}</td>
                  <td className="px-5 py-4">
                    {lead.name || lead.phone || lead.email || "Не указан"}
                  </td>
                  <td className="px-5 py-4 text-muted-ui-foreground">
                    {lead.details.checkInDate
                      ? `${lead.details.checkInDate} — ${lead.details.checkOutDate}, ${lead.details.guestsCount} гост.`
                      : "—"}
                  </td>
                  <td className="w-44 px-5 py-4">
                    <DropdownSelect<SiteLead["status"]>
                      ariaLabel={`Статус заявки ${lead.formTitle}`}
                      onChange={(status) =>
                        update.mutate({ leadId: lead.id, status })
                      }
                      options={statusOptions}
                      triggerClassName="rounded-xl border border-line px-3 py-2"
                      value={lead.status}
                    />
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
        {!leads.isLoading && !leads.data?.items.length && (
          <p className="p-12 text-center text-muted-ui-foreground">
            Заявок пока нет.
          </p>
        )}
      </div>
    </section>
  );
};
