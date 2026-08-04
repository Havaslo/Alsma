import { useMemo, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Eye, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { useAdminRequests } from "@/lib/admin/useAdmin";
import { cn } from "@/lib/cn";
import { buildRoute } from "@/lib/navigation";
import { ROUTES } from "@/route-constants";

type StatusFilter = "all" | "cancelled" | "completed" | "new" | "processing";
const statusLabels: Record<Exclude<StatusFilter, "all">, string> = { cancelled: "Отменено", completed: "Выполнено", new: "Новое", processing: "В работе" };
const statusTones: Record<Exclude<StatusFilter, "all">, string> = { cancelled: "bg-muted-ui text-muted-ui-foreground", completed: "bg-brand/10 text-brand", new: "bg-accent-ui/20 text-accent-ui-foreground", processing: "bg-supporting/25 text-accent-ui-foreground" };
const statusOptions: { label: string; value: StatusFilter }[] = [{ label: "Все статусы", value: "all" }, ...Object.entries(statusLabels).map(([value, label]) => ({ label, value: value as Exclude<StatusFilter, "all"> }))];

export const AdminRequestsPanel = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const navigate = useNavigate();
  const requests = useAdminRequests();
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ru-RU");
    return (requests.data?.items ?? []).filter((item) => {
      const haystack = [item.title, item.description, item.requester, item.contact, item.category].join(" ").toLocaleLowerCase("ru-RU");
      return (status === "all" || item.status === status) && (!term || haystack.includes(term));
    });
  }, [requests.data?.items, search, status]);

  return <div className="space-y-5"><section className="grid gap-4 md:grid-cols-[minmax(20rem,1fr)_14rem]"><label><span className="mb-2 block text-sm font-medium text-muted-ui-foreground">Поиск</span><span className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-brand-foreground px-4"><Search className="size-4 text-muted-ui-foreground" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-ui-foreground" onChange={(event) => setSearch(event.target.value)} placeholder="Заголовок, клиент, контакт" value={search} /></span></label><label><span className="mb-2 block text-sm font-medium text-muted-ui-foreground">Статус</span><DropdownSelect<StatusFilter> ariaLabel="Фильтр обращений по статусу" onChange={setStatus} options={statusOptions} triggerClassName="min-h-12 rounded-2xl border border-line bg-brand-foreground px-4 text-sm" value={status} /></label></section><section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground"><p className="border-b border-line px-5 py-4 text-sm font-semibold">Всего обращений: {items.length}</p><div className="overflow-x-auto"><table className="w-full min-w-5xl border-collapse text-left text-sm"><thead className="bg-page text-xs font-semibold tracking-wide uppercase"><tr><th className="px-5 py-4">Категория</th><th className="px-5 py-4">Дата</th><th className="px-5 py-4">Клиент</th><th className="px-5 py-4">Обращение</th><th className="px-5 py-4">Статус</th><th className="px-5 py-4 text-right">Действие</th></tr></thead><tbody>{items.map((item) => <tr className="border-t border-line align-top" key={item.id}><td className="px-5 py-4 font-semibold text-brand">{item.category}</td><td className="px-5 py-4 text-muted-ui-foreground">{new Date(item.createdAt).toLocaleString("ru-RU")}</td><td className="px-5 py-4"><strong className="block">{item.requester ?? "—"}</strong><span className="mt-1 block text-xs text-muted-ui-foreground">{item.contact ?? "—"}</span></td><td className="max-w-md px-5 py-4"><strong className="block">{item.title}</strong><span className="mt-1 block text-xs text-muted-ui-foreground">{item.description ?? "Без описания"}</span></td><td className="px-5 py-4"><span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", statusTones[item.status])}>{statusLabels[item.status]}</span></td><td className="px-5 py-4 text-right"><Button className="px-3" onClick={() => navigate({ to: buildRoute(ROUTES.adminRequest, { requestId: item.id }) })} variant="secondary"><Eye className="size-4" /> Открыть</Button></td></tr>)}</tbody></table></div>{requests.isLoading && <p className="p-12 text-center text-muted-ui-foreground">Загружаем обращения…</p>}{!requests.isLoading && !items.length && <p className="p-12 text-center text-muted-ui-foreground">Обращений пока нет.</p>}</section></div>;
};
