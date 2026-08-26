import { useState } from "react";

import { Headphones, Play } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { AdminVoiceCall } from "@/lib/admin/admin-api";
import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

const statusLabels: Record<string, string> = {
  active: "Активен",
  completed: "Завершён",
  failed: "Ошибка",
  transferring: "Перевод менеджеру",
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null || seconds < 0) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export const AdminVoiceCallDetails = ({
  calls,
}: {
  readonly calls: readonly AdminVoiceCall[];
}) => {
  const [playing, setPlaying] = useState<string | null>(null);
  if (!calls.length) return null;

  const playRecording = async (id: string) => {
    setPlaying(id);
    try {
      const { data } = await apiClient.get<{ downloadUrl: string }>(
        `/admin/voice-calls/${id}/recording`,
        { headers: { Authorization: `Bearer ${readAdminSession() ?? ""}` } },
      );
      const audio = new Audio(data.downloadUrl);
      audio.addEventListener("ended", () => setPlaying(null), { once: true });
      await audio.play();
    } catch {
      setPlaying(null);
    }
  };

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-line bg-page/50 p-5">
      <header>
        <p className="text-xs font-semibold tracking-wider text-muted-ui-foreground uppercase">
          Канал: звонок
        </p>
        <h2 className="mt-1 text-xl font-semibold text-brand">Данные звонка</h2>
      </header>
      {calls.map((call) => (
        <article
          className="rounded-2xl border border-line bg-brand-foreground p-4"
          key={call.id}
        >
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <CallValue
              label="Начало"
              value={new Date(call.startedAt).toLocaleString("ru-RU")}
            />
            <CallValue
              label="Статус"
              value={statusLabels[call.status] ?? call.status}
            />
            <CallValue
              label="Длительность"
              value={formatDuration(call.durationSec)}
            />
            <CallValue label="Результат" value={call.outcome ?? "—"} />
            <CallValue label="Намерение" value={call.intent ?? "—"} />
            <div>
              <dt className="text-muted-ui-foreground">Запись</dt>
              <dd className="mt-1">
                {call.recordingObjectId ? (
                  <Button
                    className="px-3"
                    onClick={() => void playRecording(call.id)}
                    variant="secondary"
                  >
                    {playing === call.id ? (
                      <Headphones className="size-4" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    {playing === call.id ? "Воспроизводится" : "Прослушать"}
                  </Button>
                ) : (
                  "Нет записи"
                )}
              </dd>
            </div>
          </dl>
          {call.summary && (
            <p className="mt-4 border-t border-line pt-4 text-sm leading-6">
              <strong>Резюме:</strong> {call.summary}
            </p>
          )}
        </article>
      ))}
    </section>
  );
};

const CallValue = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => (
  <div>
    <dt className="text-muted-ui-foreground">{label}</dt>
    <dd className="mt-1 font-semibold">{value}</dd>
  </div>
);
