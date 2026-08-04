import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { RequestChat } from "@/components/admin/RequestChat";
import {
  MOCK_REQUESTS,
  MOCK_REQUEST_DETAILS,
  type MockRequestDetails,
  REQUEST_STATUS_LABELS,
} from "@/lib/admin/admin-request-mocks";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/route-constants";

const normalizeBrandName = (value: string) =>
  value.replace(/ALSMA|Алсма/gi, "АЛСМА");

const fallbackDetails = (requestId: string): MockRequestDetails => {
  const request = MOCK_REQUESTS.find((item) => item.id === requestId);
  return {
    client: [
      { label: "Имя", value: request?.clientName ?? "—" },
      { label: "Телефон", value: request?.contact ?? "—" },
      { label: "Канал", value: request?.channelLabel ?? "—" },
      { label: "Намерение", value: request?.intent ?? "—" },
      {
        label: "Статус",
        value: request ? REQUEST_STATUS_LABELS[request.status] : "—",
      },
      { label: "Срок", value: "—" },
      { label: "Дата создания", value: request?.createdAt ?? "—" },
    ],
    collected: [
      { label: "Заезд", value: "Уточняется" },
      { label: "Выезд", value: "Уточняется" },
      { label: "Кол-во взрослых", value: "—" },
      { label: "Кол-во детей", value: "—" },
      { label: "Тип номера", value: "Уточняется" },
      { label: "Доп. услуги", value: "Уточняются" },
    ],
    deadline: "—",
    managerTask: "Связаться с гостем и уточнить детали обращения",
    outcome: request?.result ?? "Результат пока не зафиксирован",
    transcript: [
      { author: "guest", text: request?.intent ?? "Новое обращение гостя" },
      {
        author: "manager",
        text: "Спасибо, зафиксировали обращение. Менеджер свяжется с вами.",
      },
    ],
  };
};

export const AdminRequestDetail = ({ requestId }: { readonly requestId: string }) => {
  const request = MOCK_REQUESTS.find((item) => item.id === requestId);
  const details = MOCK_REQUEST_DETAILS[requestId] ?? fallbackDetails(requestId);

  if (!request)
    return (
      <section className="rounded-3xl border border-line bg-brand-foreground p-8">
        <h1 className="text-2xl font-semibold">Обращение не найдено</h1>
        <Link className="mt-5 inline-flex items-center gap-2 font-semibold text-brand" to={ROUTES.adminRequests}>
          <ArrowLeft className="size-4" /> Вернуться к обращениям
        </Link>
      </section>
    );

  return (
    <div className="space-y-5">
      <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-brand-foreground px-4 text-sm font-semibold text-brand" to={ROUTES.adminRequests}>
        <ArrowLeft className="size-4" /> Назад к обращениям
      </Link>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-3xl border border-line bg-brand-foreground p-6 sm:p-8">
          <header className="border-b border-line pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-muted-ui/40 px-3 py-1.5 text-xs font-semibold tracking-wide text-brand uppercase">{request.typeLabel}</span>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", request.status === "completed" && "bg-brand/10 text-brand", request.status === "processing" && "bg-supporting/25 text-accent-ui-foreground", request.status === "problem" && "bg-destructive/10 text-destructive")}>{REQUEST_STATUS_LABELS[request.status]}</span>
            </div>
            <h1 className="mt-5 text-2xl font-semibold">Транскрибация диалога</h1>
            <p className="mt-2 text-sm text-muted-ui-foreground">Источник: {request.channelLabel} · Создано {request.createdAt} · Срок: {details.deadline}</p>
          </header>
          <div className="mt-6 rounded-2xl border border-line bg-page/50 p-5"><p className="text-xs font-semibold tracking-wider text-muted-ui-foreground uppercase">Что нужно сделать менеджеру</p><p className="mt-3">{details.managerTask}</p></div>
          <div className="mt-7 space-y-6">{details.transcript.map((message, index) => <article className={cn("max-w-3xl rounded-3xl border border-line p-5", message.author === "manager" ? "ml-auto bg-panel" : "mr-auto bg-brand-foreground")} key={`${message.author}-${index}`}><p className="text-xs font-semibold tracking-wider text-muted-ui-foreground uppercase">{message.author === "manager" ? normalizeBrandName(details.managerLabel ?? "Менеджер") : "Гость"}</p><p className="mt-3 leading-7">{normalizeBrandName(message.text)}</p></article>)}</div>
          <RequestChat conversationId={requestId} initialMessages={details.transcript} />
          <div className="mt-7 rounded-2xl border border-line bg-page/50 p-5"><p className="text-xs font-semibold tracking-wider text-muted-ui-foreground uppercase">Итог обращения</p><p className="mt-3">{details.outcome}</p></div>
        </section>
        <aside className="space-y-5"><DetailsCard title="Информация о клиенте" values={details.client} /><DetailsCard title="Собранные данные" values={details.collected} /></aside>
      </div>
    </div>
  );
};

const DetailsCard = ({ title, values }: { readonly title: string; readonly values: readonly { label: string; value: string }[] }) => <section className="rounded-3xl border border-line bg-brand-foreground p-6"><h2 className="text-xl font-semibold">{title}</h2><dl className="mt-5">{values.map((item) => <div className="flex items-start justify-between gap-5 border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0" key={item.label}><dt className="text-sm text-muted-ui-foreground">{item.label}</dt><dd className="max-w-52 text-right text-sm font-semibold">{normalizeBrandName(item.value)}</dd></div>)}</dl></section>;
