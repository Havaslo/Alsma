import { MessageCircle, PhoneCall, RefreshCw } from "lucide-react";

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

const integrationFields = {
  "MAX и ВКонтакте": [
    "Токен сообщества MAX",
    "ID чата MAX",
    "Токен сообщества ВКонтакте",
    "ID сообщества ВКонтакте",
  ],
  "PMS Eptera": ["Адрес API", "Логин", "Пароль", "ID объекта"],
  Телефония: [
    "Провайдер телефонии",
    "SIP-адрес",
    "Номер для входящих звонков",
    "Номер менеджера",
  ],
} as const;

const flowSteps = [
  "Гость оставляет заявку на сайте, пишет в чат или звонит.",
  "AI-агент уточняет детали и использует данные из базы знаний.",
  "Заявка синхронизируется с PMS и появляется у менеджера.",
  "Сложный вопрос переводится человеку вместе с историей диалога.",
] as const;

export const AdminIntegrationsPanel = () => (
  <div className="space-y-6">
    <section className="rounded-3xl border border-line bg-brand-foreground p-6">
      <h2 className="text-3xl font-semibold">Интеграции</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-ui-foreground">
        Здесь можно подготовить подключение PMS Eptera, каналов MAX и ВКонтакте,
        а также телефонии для чат- и голосовых AI-агентов.
      </p>
    </section>

    <section className="grid gap-4 xl:grid-cols-3">
      {integrations.map(({ description, icon: Icon, status, title }) => (
        <article
          className="rounded-3xl border border-line bg-brand-foreground p-5"
          key={title}
        >
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
        </article>
      ))}
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        {integrations.map(({ description, status, title }) => (
          <article
            className="rounded-3xl border border-line bg-brand-foreground p-6"
            key={`details-${title}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-brand">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
                  {description}
                </p>
              </div>
              <span className="rounded-full bg-muted-ui px-3 py-1 text-xs text-muted-ui-foreground">
                {status}
              </span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {integrationFields[title].map((field) => (
                <label className="block" key={field}>
                  <span className="mb-2 block text-sm font-medium text-muted-ui-foreground">
                    {field}
                  </span>
                  <input
                    className="w-full rounded-2xl border border-line bg-brand-foreground px-4 py-3"
                    placeholder="Будет заполнено при подключении"
                    type="text"
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-line bg-page p-4 text-sm leading-6 text-muted-ui-foreground">
              Параметры сохранятся после согласования безопасного способа
              подключения и проверки доступа.
            </div>
          </article>
        ))}
      </div>

      <div className="space-y-6">
        <article className="rounded-3xl border border-line bg-brand-foreground p-6">
          <h2 className="text-lg font-semibold text-brand">
            Как это будет работать
          </h2>
          <div className="mt-5 space-y-4">
            {flowSteps.map((step, index) => (
              <div
                className="flex gap-4 rounded-2xl border border-line bg-page p-4"
                key={step}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-muted-ui-foreground">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-line bg-brand-foreground p-6">
          <h2 className="text-lg font-semibold text-brand">
            Что понадобится от вас
          </h2>
          <div className="mt-5 space-y-3">
            {[
              "Доступ к PMS Eptera и данные объекта.",
              "Токены и идентификаторы подключаемых сообществ.",
              "Данные по телефонии, SIP или доступному API.",
              "Контакты менеджеров и правила перевода обращений.",
            ].map((item) => (
              <div
                className="rounded-2xl border border-line bg-page px-4 py-4 text-sm leading-6 text-muted-ui-foreground"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  </div>
);
