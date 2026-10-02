import { useNavigate } from "@tanstack/react-router";
import { Eye, Headphones, PhoneCall, ScrollText } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { AdminVoiceCall } from "@/lib/admin/admin-api";
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

const callDetailScore = (call: AdminVoiceCall) =>
  (call.callbackRequest?.status === "pending" ? 16 : 0) +
  (call.hasTranscript ? 8 : 0) +
  (call.hasRecording ? 4 : 0) +
  (call.summary ? 2 : 0) +
  (call.durationSec !== null ? 1 : 0) +
  (call.provider === "amazi" ? 1 : 0);

const recordCountLabel = (count: number) => {
  const lastTwo = count % 100;
  const lastDigit = count % 10;
  if (lastDigit === 1 && lastTwo !== 11) return "запись";
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14))
    return "записи";
  return "записей";
};

const groupRelatedCalls = (items: readonly AdminVoiceCall[]) => {
  const groups = new Map<
    string,
    { call: AdminVoiceCall; recordCount: number }
  >();

  for (const call of items) {
    const key = call.providerEntryId
      ? `entry:${call.providerEntryId}`
      : `call:${call.id}`;
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { call, recordCount: 1 });
      continue;
    }

    groups.set(key, {
      call:
        callDetailScore(call) > callDetailScore(group.call) ? call : group.call,
      recordCount: group.recordCount + 1,
    });
  }

  return [...groups.values()];
};

export const AdminVoiceCallsPanel = () => {
  const calls = useAdminVoiceCalls();
  const navigate = useNavigate();
  const callGroups = groupRelatedCalls(calls.data?.items ?? []);

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
          Отдельный журнал звонков: звонящий, запись, транскрипция и результат
          разговора. Звонки не являются обращениями.
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
                <th className="px-5 py-4 text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {callGroups.map(({ call, recordCount }) => (
                <tr className="border-t border-line align-top" key={call.id}>
                  <td className="px-5 py-4">
                    <strong className="block">
                      {call.callerPhone ?? "Номер не определён"}
                    </strong>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block text-muted-ui-foreground">
                      {new Date(call.startedAt).toLocaleString("ru-RU")}
                    </span>
                    <strong className="mt-1 block">
                      {durationLabel(call.durationSec)}
                    </strong>
                    {recordCount > 1 && (
                      <span className="mt-1 block text-xs text-muted-ui-foreground">
                        {recordCount} {recordCountLabel(recordCount)} одного
                        звонка
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <strong className="block">
                      {statusLabel(call.status)}
                    </strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      {call.outcome ?? call.intent ?? "Результат не указан"}
                    </span>
                    {call.callbackRequest && (
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          call.callbackRequest.status === "pending"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-supporting/25 text-accent-ui-foreground"
                        }`}
                      >
                        {call.callbackRequest.status === "pending"
                          ? "Нужно перезвонить"
                          : "Перезвон выполнен"}
                      </span>
                    )}
                  </td>
                  <td className="max-w-md px-5 py-4">
                    <span className="line-clamp-2 block text-muted-ui-foreground">
                      {call.callbackRequest?.reason ??
                        call.summary ??
                        "Резюме ещё не сформировано."}
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
        {!calls.isLoading && !callGroups.length && (
          <p className="p-12 text-center text-muted-ui-foreground">
            <PhoneCall className="mx-auto mb-3 size-6 text-brand" />
            Входящих звонков пока нет.
          </p>
        )}
      </section>
    </div>
  );
};
