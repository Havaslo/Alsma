import { useEffect, useState } from "react";

import { Headphones, Play } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

type Call = {
  id: string;
  callerPhone: string | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  transcript: Array<{ role?: string; text?: string }>;
  summary: string | null;
  hasRecording: boolean;
};

export const AdminVoiceCallsPanel = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    void apiClient
      .get<{ items: Call[] }>("/admin/voice-calls", {
        headers: { Authorization: `Bearer ${readAdminSession() ?? ""}` },
      })
      .then(({ data }) => setCalls(data.items));
  }, []);
  const playRecording = async (id: string) => {
    const { data } = await apiClient.get<{ downloadUrl: string }>(
      `/admin/voice-calls/${id}/recording`,
      { headers: { Authorization: `Bearer ${readAdminSession() ?? ""}` } },
    );
    const audio = new Audio(data.downloadUrl);
    await audio.play();
  };
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-[0.2em] text-brand/60 uppercase">
          Телефония
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-brand">
          Входящие звонки
        </h1>
        <p className="mt-2 text-muted-ui-foreground">
          Записи и расшифровки доступны только пользователям с правом просмотра
          звонков. Хранение — 30 дней.
        </p>
      </div>
      <div className="space-y-3">
        {calls.map((call) => (
          <article
            className="rounded-3xl border border-line bg-white p-5"
            key={call.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Headphones className="size-5 text-brand" />
                <strong>{call.callerPhone ?? "Номер не определён"}</strong>
                <span className="text-sm text-muted-ui-foreground">
                  {new Date(call.startedAt).toLocaleString("ru-RU")}
                </span>
              </div>
              {call.hasRecording && (
                <Button
                  onClick={() => void playRecording(call.id)}
                  variant="secondary"
                >
                  <Play className="size-4" /> Запись
                </Button>
              )}
            </div>
            {call.summary && <p className="mt-3 text-sm">{call.summary}</p>}
            <button
              className="mt-3 text-sm font-semibold text-brand underline"
              onClick={() => setActive(active === call.id ? null : call.id)}
              type="button"
            >
              {active === call.id
                ? "Скрыть расшифровку"
                : "Показать расшифровку"}
            </button>
            {active === call.id && (
              <div className="mt-3 space-y-2 rounded-2xl bg-page p-4 text-sm">
                {call.transcript.map((item, index) => (
                  <p key={`${call.id}-${index}`}>
                    <strong>
                      {item.role === "assistant" ? "Агент" : "Клиент"}:
                    </strong>{" "}
                    {item.text}
                  </p>
                ))}
              </div>
            )}
          </article>
        ))}
        {!calls.length && (
          <p className="rounded-3xl border border-dashed border-line p-8 text-center text-muted-ui-foreground">
            Входящих звонков пока нет.
          </p>
        )}
      </div>
    </section>
  );
};
