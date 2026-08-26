import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { RequestChat } from "@/components/admin/RequestChat";
import { useAdminRequests } from "@/lib/admin/useAdmin";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/route-constants";

const statusLabels = {
  cancelled: "Отменено",
  completed: "Выполнено",
  new: "Новое",
  processing: "В работе",
} as const;
const normalizeBrandName = (value: string) =>
  value.replace(/ALSMA|Алсма/gi, "АЛСМА");

export const AdminRequestDetail = ({
  requestId,
}: {
  readonly requestId: string;
}) => {
  const requests = useAdminRequests();
  const request = requests.data?.items.find((item) => item.id === requestId);

  if (requests.isLoading)
    return (
      <p className="rounded-3xl border border-line bg-brand-foreground p-8 text-muted-ui-foreground">
        Загружаем обращение…
      </p>
    );
  if (!request)
    return (
      <section className="rounded-3xl border border-line bg-brand-foreground p-8">
        <h1 className="text-2xl font-semibold">Обращение не найдено</h1>
        <Link
          className="mt-5 inline-flex items-center gap-2 font-semibold text-brand"
          to={ROUTES.adminRequests}
        >
          <ArrowLeft className="size-4" /> Вернуться к обращениям
        </Link>
      </section>
    );

  return (
    <div className="space-y-5">
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-brand-foreground px-4 text-sm font-semibold text-brand"
        to={ROUTES.adminRequests}
      >
        <ArrowLeft className="size-4" /> Назад к обращениям
      </Link>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-3xl border border-line bg-brand-foreground p-6 sm:p-8">
          <header className="border-b border-line pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-muted-ui/40 px-3 py-1.5 text-xs font-semibold tracking-wide text-brand uppercase">
                {request.category}
              </span>
              <span
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  request.status === "completed" && "bg-brand/10 text-brand",
                  request.status === "processing" &&
                    "bg-supporting/25 text-accent-ui-foreground",
                  request.status === "new" &&
                    "bg-accent-ui/20 text-accent-ui-foreground",
                  request.status === "cancelled" &&
                    "bg-muted-ui text-muted-ui-foreground",
                )}
              >
                {statusLabels[request.status]}
              </span>
            </div>
            <h1 className="mt-5 text-2xl font-semibold">
              {normalizeBrandName(request.title)}
            </h1>
            <p className="mt-2 text-sm text-muted-ui-foreground">
              Создано {new Date(request.createdAt).toLocaleString("ru-RU")}
            </p>
          </header>
          <div className="mt-6 rounded-2xl border border-line bg-page/50 p-5">
            <p className="text-xs font-semibold tracking-wider text-muted-ui-foreground uppercase">
              Описание обращения
            </p>
            <p className="mt-3 leading-7">
              {request.description ?? "Описание не указано."}
            </p>
          </div>
          <RequestChat conversationId={request.id} initialMessages={[]} />
        </section>
        <aside className="space-y-5">
          <DetailsCard
            title="Информация о клиенте"
            values={[
              { label: "Имя", value: request.requester ?? "—" },
              { label: "Контакт", value: request.contact ?? "—" },
              { label: "Категория", value: request.category },
              { label: "Статус", value: statusLabels[request.status] },
              {
                label: "Создано",
                value: new Date(request.createdAt).toLocaleString("ru-RU"),
              },
            ]}
          />
          <DetailsCard
            title="Технические данные"
            values={[
              { label: "ID обращения", value: request.id },
              {
                label: "Обновлено",
                value: new Date(request.updatedAt).toLocaleString("ru-RU"),
              },
            ]}
          />
        </aside>
      </div>
    </div>
  );
};

const DetailsCard = ({
  title,
  values,
}: {
  readonly title: string;
  readonly values: readonly { label: string; value: string }[];
}) => (
  <section className="rounded-3xl border border-line bg-brand-foreground p-6">
    <h2 className="text-xl font-semibold">{title}</h2>
    <dl className="mt-5">
      {values.map((item) => (
        <div
          className="flex items-start justify-between gap-5 border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0"
          key={item.label}
        >
          <dt className="text-sm text-muted-ui-foreground">{item.label}</dt>
          <dd className="max-w-52 text-right text-sm font-semibold">
            {normalizeBrandName(item.value)}
          </dd>
        </div>
      ))}
    </dl>
  </section>
);
