import { useMemo, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Bot, Eye, Search, UserRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import type { AdminRequest } from "@/lib/admin/admin-api";
import { useAdminRequests } from "@/lib/admin/useAdmin";
import { cn } from "@/lib/cn";
import { buildRoute } from "@/lib/navigation";
import { ROUTES } from "@/route-constants";

type StatusFilter = "all" | "cancelled" | "completed" | "new" | "processing";
type RequestType = "all" | "call" | "chat";
const statusLabels: Record<Exclude<StatusFilter, "all">, string> = {
  cancelled: "Отменено",
  completed: "Выполнено",
  new: "Новое",
  processing: "В работе",
};
const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "Все статусы", value: "all" },
  ...Object.entries(statusLabels).map(([value, label]) => ({
    label,
    value: value as Exclude<StatusFilter, "all">,
  })),
];
const typeOptions: { label: string; value: RequestType }[] = [
  { label: "Все типы", value: "all" },
  { label: "Звонки", value: "call" },
  { label: "Чаты", value: "chat" },
];
const requestType = (item: AdminRequest): Exclude<RequestType, "all"> =>
  item.details.channelType === "call" ? "call" : "chat";
const requestTypeLabel = (type: Exclude<RequestType, "all">) =>
  type === "call" ? "Звонок" : "Чат";
const sourceLabel = (source: string | undefined) => {
  const value = source?.toLocaleLowerCase("ru-RU") ?? "";
  if (value.includes("vk")) return "VK";
  if (value.includes("telegram") || value.includes("max")) return "MAX";
  if (
    value.includes("phone") ||
    value.includes("call") ||
    value.includes("телефон") ||
    value.includes("звон")
  )
    return "Звонки";
  return "Сайт";
};
const readKey = (id: string) => `alsma-admin-request-read-${id}`;

const assignee = (item: AdminRequest) => {
  if (item.agentStopped)
    return {
      label: "Агент остановлен",
      className: "bg-muted-ui text-muted-ui-foreground",
      Icon: Bot,
    };
  if (item.details.managerRequested)
    return {
      label: "Запрошен менеджер",
      className: "bg-destructive/10 text-destructive",
      Icon: UserRound,
    };
  if (item.details.chatMode === "manager")
    return {
      label: "Менеджер",
      className: "bg-supporting/25 text-accent-ui-foreground",
      Icon: UserRound,
    };
  return {
    label: "AI-агент",
    className: "bg-brand/10 text-brand",
    Icon: Bot,
  };
};

export const AdminRequestsPanel = ({
  initialType = "all",
}: {
  readonly initialType?: RequestType;
}) => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<RequestType>(initialType);
  const [readAt, setReadAt] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const requests = useAdminRequests();
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ru-RU");
    return (requests.data?.items ?? [])
      .filter((item) => {
        const haystack = [
          item.title,
          item.description,
          item.requester,
          item.contact,
          item.category,
          item.details.source,
        ]
          .join(" ")
          .toLocaleLowerCase("ru-RU");
        return (
          (status === "all" || item.status === status) &&
          (type === "all" || requestType(item) === type) &&
          (!term || haystack.includes(term))
        );
      })
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      );
  }, [requests.data?.items, search, status, type]);
  const openRequest = (item: AdminRequest) => {
    localStorage.setItem(readKey(item.id), item.updatedAt);
    setReadAt((current) => ({ ...current, [item.id]: item.updatedAt }));
    navigate({ to: buildRoute(ROUTES.adminRequest, { requestId: item.id }) });
  };
  const isNewMessage = (item: AdminRequest) => {
    const lastRead = readAt[item.id] ?? localStorage.getItem(readKey(item.id));
    return (
      !lastRead ||
      new Date(item.updatedAt).getTime() > new Date(lastRead).getTime()
    );
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        {initialType === "call" && (
          <p className="text-sm text-muted-ui-foreground">
            Быстрый фильтр обращений с каналом «Звонок». История, транскрипция и
            запись находятся внутри единого обращения.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-[minmax(20rem,1fr)_12rem_12rem]">
          <label>
            <span className="mb-2 block text-sm font-medium text-muted-ui-foreground">
              Поиск
            </span>
            <span className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-brand-foreground px-4">
              <Search className="size-4 text-muted-ui-foreground" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-ui-foreground"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Заголовок, клиент, контакт"
                value={search}
              />
            </span>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-muted-ui-foreground">
              Тип обращения
            </span>
            <DropdownSelect<RequestType>
              ariaLabel="Фильтр по типу обращения"
              onChange={setType}
              options={typeOptions}
              triggerClassName="min-h-12 rounded-2xl border border-line bg-brand-foreground px-4 text-sm"
              value={type}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-muted-ui-foreground">
              Статус обращения
            </span>
            <DropdownSelect<StatusFilter>
              ariaLabel="Фильтр обращений по статусу"
              onChange={setStatus}
              options={statusOptions}
              triggerClassName="min-h-12 rounded-2xl border border-line bg-brand-foreground px-4 text-sm"
              value={status}
            />
          </label>
        </div>
      </section>
      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
        <p className="border-b border-line px-5 py-4 text-sm font-semibold">
          Всего обращений: {items.length}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-6xl border-collapse text-left text-sm">
            <thead className="bg-page text-xs font-semibold tracking-wide uppercase">
              <tr>
                <th className="px-5 py-4">Источник</th>
                <th className="px-5 py-4">Последняя активность</th>
                <th className="px-5 py-4">Клиент</th>
                <th className="px-5 py-4">Обращение</th>
                <th className="px-5 py-4">Кто отвечает</th>
                <th className="px-5 py-4 text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const currentType = requestType(item);
                const newMessage = isNewMessage(item);
                const currentAssignee = assignee(item);
                const AssigneeIcon = currentAssignee.Icon;
                return (
                  <tr
                    className={cn(
                      "border-t border-line align-top",
                      newMessage && "bg-accent-ui/5",
                    )}
                    key={item.id}
                  >
                    <td className="px-5 py-4">
                      <strong className="block font-semibold text-brand">
                        {sourceLabel(item.details.source)}
                      </strong>
                      <span className="mt-1 block text-xs text-muted-ui-foreground">
                        {requestTypeLabel(currentType)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-ui-foreground">
                      {new Date(item.updatedAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block">{item.requester ?? "—"}</strong>
                      <span className="mt-1 block text-xs text-muted-ui-foreground">
                        {item.contact ?? "—"}
                      </span>
                    </td>
                    <td className="max-w-md px-5 py-4">
                      <strong className="block">{item.title}</strong>
                      <span className="mt-1 block text-xs text-muted-ui-foreground">
                        {item.description ?? "Без описания"}
                      </span>
                      {item._count?.chatMessages ? (
                        <span className="mt-1 block text-xs font-medium text-brand">
                          Сообщений в диалоге: {item._count.chatMessages}
                        </span>
                      ) : null}
                      {newMessage && (
                        <span className="mt-2 inline-flex rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                          Новое сообщение
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                          currentAssignee.className,
                        )}
                      >
                        <AssigneeIcon className="size-3.5" />
                        {currentAssignee.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        className="px-3"
                        onClick={() => openRequest(item)}
                        variant="secondary"
                      >
                        <Eye className="size-4" /> Открыть
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {requests.isLoading && (
          <p className="p-12 text-center text-muted-ui-foreground">
            Загружаем обращения…
          </p>
        )}
        {!requests.isLoading && !items.length && (
          <p className="p-12 text-center text-muted-ui-foreground">
            Обращений пока нет.
          </p>
        )}
      </section>
    </div>
  );
};
