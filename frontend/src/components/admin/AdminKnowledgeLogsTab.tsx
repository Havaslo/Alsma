import type { KnowledgeLog } from "@/lib/admin/knowledge-base-api";

const STATUS_LABELS: Record<KnowledgeLog["status"], string> = {
  answered: "Ответ найден",
  no_answer: "Нет ответа",
};

export const AdminKnowledgeLogsTab = ({
  logs,
}: {
  readonly logs: KnowledgeLog[];
}) => (
  <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
    <div className="p-6">
      <h2 className="text-xl font-semibold text-brand">
        Логи запросов к базе знаний
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
        Здесь видно, на какие вопросы агент не смог ответить и где базе знаний
        не хватает информации.
      </p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-4xl border-collapse text-left text-sm">
        <thead className="bg-page text-xs font-semibold">
          <tr>
            <th className="px-5 py-4">Канал</th>
            <th className="px-5 py-4">Вопрос</th>
            <th className="px-5 py-4">Статус</th>
            <th className="px-5 py-4">Ответ</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr className="border-t border-line align-top" key={log.id}>
              <td className="px-5 py-4">
                {log.channel === "voice" ? "Голос" : "Текст"}
              </td>
              <td className="px-5 py-4 font-semibold">{log.query}</td>
              <td className="px-5 py-4">
                <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                  {STATUS_LABELS[log.status]}
                </span>
              </td>
              <td className="max-w-2xl px-5 py-4 text-muted-ui-foreground">
                {log.answer || "Ответ не сформирован"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {!logs.length && (
      <p className="border-t border-line px-6 py-8 text-sm text-muted-ui-foreground">
        Запросов пока нет.
      </p>
    )}
  </section>
);
