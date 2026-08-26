import { useState } from "react";

import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ClipboardList,
  Headphones,
  Play,
  ScrollText,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { readAdminSession } from "@/lib/admin/admin-session";
import { useAdminVoiceCall } from "@/lib/admin/useAdmin";
import { apiClient } from "@/lib/api/api-client";
import { buildRoute } from "@/lib/navigation";
import { ROUTES } from "@/route-constants";

const roleLabel = (role?: string) =>
  ({
    assistant: "AI-агент",
    guest: "Клиент",
    manager: "Менеджер",
    system: "Система",
  })[role ?? "system"] ?? "Система";
const durationLabel = (seconds: number | null) =>
  seconds === null
    ? "—"
    : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const segmentTime = (segment: {
  readonly at?: string;
  readonly startedAt?: string;
}) => segment.startedAt ?? segment.at ?? "";

export const AdminVoiceCallDetail = ({
  callId,
}: {
  readonly callId: string;
}) => {
  const query = useAdminVoiceCall(callId);
  const [playing, setPlaying] = useState(false);
  const call = query.data?.call;
  const transcript = [...(call?.transcript ?? [])].sort((left, right) =>
    segmentTime(left).localeCompare(segmentTime(right)),
  );
  const play = async () => {
    setPlaying(true);
    try {
      const { data } = await apiClient.get<{ downloadUrl: string }>(
        `/admin/voice-calls/${callId}/recording`,
        {
          headers: { Authorization: `Bearer ${readAdminSession() ?? ""}` },
        },
      );
      const audio = new Audio(data.downloadUrl);
      audio.addEventListener("ended", () => setPlaying(false), { once: true });
      await audio.play();
    } catch {
      setPlaying(false);
    }
  };

  if (query.isLoading)
    return (
      <p className="rounded-3xl border border-line bg-brand-foreground p-8 text-muted-ui-foreground">
        Загружаем звонок…
      </p>
    );
  if (!call)
    return (
      <p className="rounded-3xl border border-line bg-brand-foreground p-8">
        Звонок не найден.
      </p>
    );

  return (
    <div className="space-y-5">
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-brand-foreground px-4 text-sm font-semibold text-brand"
        to={ROUTES.adminVoiceCalls}
      >
        <ArrowLeft className="size-4" /> Назад к звонкам
      </Link>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-3xl border border-line bg-brand-foreground p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-wider text-muted-ui-foreground uppercase">
            Входящий звонок
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {call.adminRequest?.requester ?? "Клиент не представился"}
          </h1>
          <p className="mt-2 text-sm text-muted-ui-foreground">
            {call.callerPhone ?? "Номер не определён"} ·{" "}
            {new Date(call.startedAt).toLocaleString("ru-RU")}
          </p>
          {call.summary && (
            <p className="mt-6 rounded-2xl border border-line bg-page/50 p-5 text-sm leading-6">
              <strong>Резюме:</strong> {call.summary}
            </p>
          )}
          <section className="mt-6 rounded-2xl border border-line bg-page/50 p-5">
            <div className="flex items-center gap-2">
              <ScrollText className="size-5 text-brand" />
              <h2 className="text-xl font-semibold">Транскрипция</h2>
            </div>
            {call.hasTranscript ? (
              <div className="mt-5 space-y-3">
                {transcript.map(
                  (segment, index) =>
                    segment.text && (
                      <article
                        className="rounded-xl border border-line bg-brand-foreground px-4 py-3 text-sm"
                        key={`${call.id}-${index}`}
                      >
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-brand">
                          <span>{roleLabel(segment.role)}</span>
                          {segmentTime(segment) && (
                            <time className="text-muted-ui-foreground">
                              {new Date(
                                segmentTime(segment),
                              ).toLocaleTimeString("ru-RU")}
                            </time>
                          )}
                        </div>
                        <p>{segment.text}</p>
                      </article>
                    ),
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-ui-foreground">
                Транскрипция для этого звонка не поступила.
              </p>
            )}
          </section>
        </section>
        <aside className="space-y-5">
          <section className="rounded-3xl border border-line bg-brand-foreground p-6">
            <h2 className="text-xl font-semibold">Данные звонка</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <Meta label="Статус" value={call.status} />
              <Meta
                label="Длительность"
                value={durationLabel(call.durationSec)}
              />
              <Meta label="Результат" value={call.outcome ?? "—"} />
              <Meta label="Намерение" value={call.intent ?? "—"} />
            </dl>
            {call.hasRecording && (
              <Button
                className="mt-5 w-full"
                onClick={() => void play()}
                variant="secondary"
              >
                {playing ? (
                  <Headphones className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
                {playing ? "Воспроизводится" : "Прослушать запись"}
              </Button>
            )}
          </section>
          {call.adminRequest && (
            <Link
              className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground"
              to={buildRoute(ROUTES.adminRequest, {
                requestId: call.adminRequest.id,
              })}
            >
              <ClipboardList className="size-4" /> Открыть связанное обращение
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
};

const Meta = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => (
  <div className="flex justify-between gap-4 border-t border-line pt-4 first:border-t-0 first:pt-0">
    <dt className="text-muted-ui-foreground">{label}</dt>
    <dd className="text-right font-semibold">{value}</dd>
  </div>
);
