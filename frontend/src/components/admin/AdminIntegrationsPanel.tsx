import { Cable, MessageCircle, PhoneCall, RefreshCw } from "lucide-react";

const integrations = [
  {
    description: "Бронирования, доступность номеров, тарифы и передача заявок.",
    icon: RefreshCw,
    status: "Не подключено",
    title: "PMS Eptera",
  },
  {
    description: "Уведомления о новых заявках и работа чат-агентов.",
    icon: MessageCircle,
    status: "Ожидает данных",
    title: "MAX и ВКонтакте",
  },
  {
    description: "Приём звонков, голосовые ответы и перевод на менеджера.",
    icon: PhoneCall,
    status: "Нужно согласование",
    title: "Телефония",
  },
] as const;

export const AdminIntegrationsPanel = () => (
  <section className="mt-8 rounded-3xl border border-line bg-panel p-6">
    <p className="flex items-center gap-2 text-sm font-semibold text-brand">
      <Cable className="size-4" /> Интеграции
    </p>
    <h2 className="mt-1 font-heading text-3xl font-semibold">
      Подключение внешних каналов
    </h2>
    <p className="mt-2 max-w-3xl text-muted-ui-foreground">
      Подготовка PMS Eptera, каналов MAX и ВКонтакте, а также телефонии для чат-
      и голосовых AI-агентов.
    </p>
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      {integrations.map(({ description, icon: Icon, status, title }) => (
        <article className="rounded-2xl bg-page p-5" key={title}>
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
              <Icon className="size-5" />
            </span>
            <span className="rounded-full bg-muted-ui px-3 py-1 text-xs text-muted-ui-foreground">
              {status}
            </span>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-brand">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
            {description}
          </p>
          <div className="mt-4 rounded-xl border border-line bg-panel px-4 py-3 text-sm">
            Параметры будут заполнены при подключении
          </div>
        </article>
      ))}
    </div>
  </section>
);
