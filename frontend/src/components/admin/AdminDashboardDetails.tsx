import { ArrowUpRight, CheckCircle2, PhoneCall } from "lucide-react";

const metrics = [
  {
    change: "+14% к прошлому дню",
    label: "Кол-во обращений",
    value: "84",
  },
  {
    change: "79% от всех обращений",
    label: "Обработано AI-агентом",
    value: "66",
  },
  {
    change: "21% потребовали участия",
    label: "Передано менеджеру",
    value: "18",
  },
  {
    change: "Конверсия из обращения — 37%",
    label: "Создано заявок",
    value: "31",
  },
] as const;

const channels = [
  ["Телефон", "44", "52%"],
  ["Сайт", "21", "25%"],
  ["MAX", "11", "13%"],
  ["ВКонтакте", "8", "10%"],
] as const;

const recentCalls = [
  {
    duration: "04:18",
    phone: "+7 921 442-18-06",
    result: "Заявка создана",
    topic: "Семейный номер и SPA",
  },
  {
    duration: "02:46",
    phone: "+7 999 106-77-24",
    result: "Передано менеджеру",
    topic: "Трансфер до отеля",
  },
  {
    duration: "06:03",
    phone: "+7 911 804-35-17",
    result: "Консультация завершена",
    topic: "Коттедж для компании",
  },
  {
    duration: "03:22",
    phone: "+7 921 700-41-52",
    result: "Бронь подтверждена",
    topic: "Заезд на выходные",
  },
] as const;

const recommendations = [
  "Добавить короткое описание состава каждого SPA-пакета.",
  "Уточнить интервалы и стоимость трансфера для разных маршрутов.",
  "Дополнить ответы по размещению детей и дополнительным местам.",
] as const;

export const AdminDashboardDetails = () => (
  <>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ change, label, value }) => (
        <article
          className="rounded-3xl border border-line bg-brand-foreground p-5"
          key={label}
        >
          <p className="text-sm text-muted-ui-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-brand">{value}</p>
          <p className="mt-3 flex items-center gap-1 text-sm text-muted-ui-foreground">
            <ArrowUpRight className="size-4 text-brand" />
            {change}
          </p>
        </article>
      ))}
    </section>

    <section className="mt-6 grid gap-4 xl:grid-cols-2">
      <article className="rounded-3xl border border-line bg-brand-foreground p-5">
        <h3 className="text-2xl font-semibold">Обращения по каналам</h3>
        <p className="mt-2 text-sm text-muted-ui-foreground">
          Распределение входящих диалогов за выбранный период.
        </p>
        <div className="mt-7 space-y-5">
          {channels.map(([label, value, width]) => (
            <div key={label}>
              <div className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted-ui/50">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-3xl border border-line bg-brand-foreground p-5">
        <h3 className="text-2xl font-semibold">Качество обработки</h3>
        <p className="mt-2 text-sm text-muted-ui-foreground">
          Итоги диалогов, завершённых агентом без участия менеджера.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-4">
          {[
            ["Среднее время ответа", "7 сек"],
            ["Решено с первого раза", "74%"],
            ["Средняя длительность", "3:48"],
            ["Оценка гостями", "4,8"],
          ].map(([label, value]) => (
            <div
              className="rounded-2xl border border-line bg-page p-5"
              key={label}
            >
              <p className="text-sm text-muted-ui-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-brand">{value}</p>
            </div>
          ))}
        </div>
      </article>
    </section>

    <section className="mt-14">
      <h2 className="text-3xl font-semibold">
        Последние обращения по телефону
      </h2>
      <p className="mt-3 text-muted-ui-foreground">
        Недавние звонки и результат работы агента по каждому диалогу.
      </p>
      <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-brand-foreground">
        <div className="grid grid-cols-[1fr_1.4fr_0.6fr_1fr] gap-4 border-b border-line bg-page px-5 py-4 text-sm font-semibold text-muted-ui-foreground">
          <span>Телефон</span>
          <span>Тема</span>
          <span>Время</span>
          <span>Результат</span>
        </div>
        {recentCalls.map((call) => (
          <div
            className="grid grid-cols-[1fr_1.4fr_0.6fr_1fr] gap-4 border-b border-line px-5 py-5 text-sm last:border-0"
            key={`${call.phone}-${call.duration}`}
          >
            <strong className="text-brand">{call.phone}</strong>
            <span>{call.topic}</span>
            <span className="text-muted-ui-foreground">{call.duration}</span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-4 text-brand" />
              {call.result}
            </span>
          </div>
        ))}
      </div>
    </section>

    <section className="mt-14 rounded-3xl border border-line bg-brand-foreground p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
          <PhoneCall className="size-5" />
        </span>
        <div>
          <h2 className="text-3xl font-semibold">
            Что улучшить в сценарии сегодня
          </h2>
          <p className="mt-3 text-muted-ui-foreground">
            Рекомендации собраны по повторяющимся вопросам текущей смены.
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {recommendations.map((recommendation, index) => (
          <article
            className="rounded-2xl border border-line bg-page p-5"
            key={recommendation}
          >
            <span className="text-sm font-semibold text-brand">
              0{index + 1}
            </span>
            <p className="mt-3 leading-7">{recommendation}</p>
          </article>
        ))}
      </div>
    </section>
  </>
);
