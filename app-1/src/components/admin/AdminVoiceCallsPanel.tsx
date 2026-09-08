import { useNavigate } from "@tanstack/react-router";
import {
  ClipboardList,
  Eye,
  Headphones,
  PhoneCall,
  ScrollText,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAdminVoiceCalls } from "@/lib/admin/useAdmin";
import { buildRoute } from "@/lib/navigation";
import { ROUTES } from "@/route-constants";

const statusLabel = (status: string) =>
  ({
    active: "Активен",
    completed: "Завершён",
    failed: "Ошибка",
    transferring: "Перевод менеджеру",
  })[status] ?? status;

const durationLabel = (seconds: number | null) => {
  if (seconds === null || seconds < 0) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export const AdminVoiceCallsPanel = () => {
  const calls = useAdminVoiceCalls();
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <section>
        <p className="text-sm font-semibold tracking-[0.2em] text-brand/60 uppercase">
          Телефония
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-brand">
          Входящие звонки
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-ui-foreground">
          Отдельный журнал звонков: запись, транскрипция и результат разговора.
          Связанное обращение открывается отдельно и не смешивает звонок с
          чатом.
        </p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
        <div className="overflow-x-auto">
          <table className="w-full min-w-6xl border-collapse text-left text-sm">
            <thead className="bg-page text-xs font-semibold tracking-wide text-muted-ui-foreground uppercase">
              <tr>
                <th className="px-5 py-4">Звонящий</th>
                <th className="px-5 py-4">Начало и длительность</th>
                <th className="px-5 py-4">Статус и результат</th>
                <th className="px-5 py-4">Содержание</th>
                <th className="px-5 py-4">Связь</th>
                <th className="px-5 py-4 text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {(calls.data?.items ?? []).map((call) => (
                <tr className="border-t border-line align-top" key={call.id}>
                  <td className="px-5 py-4">
                    <strong className="block">
                      {call.adminRequest?.requester ?? "Клиент не представился"}
                    </strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      {call.callerPhone ?? "Номер не определён"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block text-muted-ui-foreground">
                      {new Date(call.startedAt).toLocaleString("ru-RU")}
                    </span>
                    <strong className="mt-1 block">
                      {durationLabel(call.durationSec)}
                    </strong>
                  </td>
                  <td className="px-5 py-4">
                    <strong className="block">
                      {statusLabel(call.status)}
                    </strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      {call.outcome ?? call.intent ?? "Результат не указан"}
                    </span>
                  </td>
                  <td className="max-w-md px-5 py-4">
                    <span className="line-clamp-2 block text-muted-ui-foreground">
                      {call.summary ?? "Резюме ещё не сформировано."}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-brand">
                      {call.hasRecording && (
                        <span>
                          <Headphones className="mr-1 inline size-3.5" />
                          Запись
                        </span>
                      )}
                      {call.recordingStatus === "pending" && (
                        <span className="text-muted-ui-foreground">
                          Запись получена, готовится к прослушиванию
                        </span>
                      )}
                      {call.hasTranscript && (
                        <span>
                          <ScrollText className="mr-1 inline size-3.5" />
                          Транскрипция
                        </span>
                      )}
                      {!call.hasTranscript && call.hasRecording && (
                        <span className="text-muted-ui-foreground">
                          Транскрипция не поступила
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {call.adminRequest ? (
                      <button
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand underline"
                        onClick={() =>
                          navigate({
                            to: buildRoute(ROUTES.adminRequest, {
                              requestId: call.adminRequest!.id,
                            }),
                          })
                        }
                        type="button"
                      >
                        <ClipboardList className="size-3.5" /> Обращение
                      </button>
                    ) : (
                      <span className="text-xs text-muted-ui-foreground">
                        Не связано
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      className="px-3"
                      onClick={() =>
                        navigate({
                          to: buildRoute(ROUTES.adminVoiceCall, {
                            callId: call.id,
                          }),
                        })
                      }
                      variant="secondary"
                    >
                      <Eye className="size-4" /> Открыть
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {calls.isLoading && (
          <p className="p-12 text-center text-muted-ui-foreground">
            Загружаем звонки…
          </p>
        )}
        {!calls.isLoading && !calls.data?.items.length && (
          <p className="p-12 text-center text-muted-ui-foreground">
            <PhoneCall className="mx-auto mb-3 size-6 text-brand" />
            Входящих звонков пока нет.
          </p>
        )}
      </section>
    </div>
  );
};
