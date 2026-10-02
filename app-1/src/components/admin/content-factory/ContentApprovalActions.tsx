import { useState } from "react";

import { CalendarClock, Check, Clock3, Save, Send } from "lucide-react";

import { Button } from "@/components/ui/Button";

import { FactoryCard, QuietButton } from "./ContentFactoryPrimitives";

export const ContentApprovalActions = ({
  approved,
  selectedCount,
  onApprove,
  onPublish,
  onSaveDraft,
  onSchedule,
}: {
  approved: boolean;
  selectedCount: number;
  onApprove: () => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  onSchedule: (date: string, time: string) => void;
}) => {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [date, setDate] = useState("2026-11-06");
  const [time, setTime] = useState("11:00");

  return (
    <FactoryCard className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className={`grid size-9 place-items-center rounded-full ${
                approved
                  ? "bg-brand/10 text-brand"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {approved ? (
                <Check className="size-4" />
              ) : (
                <Clock3 className="size-4" />
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-page-foreground">
                {approved
                  ? "Материал согласован"
                  : "Проверьте версии и согласуйте материал"}
              </p>
              <p className="mt-0.5 text-xs text-muted-ui-foreground">
                {approved
                  ? `${selectedCount} канал${selectedCount === 1 ? "" : selectedCount < 5 ? "а" : "ов"} включено · публикация только по вашему действию`
                  : "До согласования публикация не отправляется ни в один канал"}
              </p>
            </div>
          </div>
        </div>

        {!approved ? (
          <Button
            className="min-h-12 rounded-xl bg-brand px-6 text-white shadow-md shadow-emerald-900/10 hover:bg-brand/90"
            disabled={selectedCount === 0}
            onClick={onApprove}
            type="button"
          >
            <Check className="size-4" /> Согласовать
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11 rounded-xl bg-brand text-white hover:bg-brand/90"
              onClick={onPublish}
              type="button"
            >
              <Send className="size-4" /> Опубликовать сейчас
            </Button>
            <QuietButton onClick={() => setScheduleOpen(true)}>
              <CalendarClock className="size-4" /> Запланировать
            </QuietButton>
            <QuietButton onClick={onSaveDraft}>
              <Save className="size-4" /> Сохранить в черновики
            </QuietButton>
          </div>
        )}
      </div>

      {scheduleOpen && (
        <div
          aria-label="Запланировать публикацию"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-3xl border border-line bg-brand-foreground p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-brand uppercase">
                  Публикация по расписанию
                </p>
                <h3 className="mt-2 text-xl font-semibold text-page-foreground">
                  Выберите дату и время
                </h3>
              </div>
              <button
                aria-label="Закрыть"
                className="grid size-9 place-items-center rounded-xl text-muted-ui-foreground transition hover:bg-muted-ui/50"
                onClick={() => setScheduleOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
              В демо-режиме выбранное расписание отобразится в контент-плане, но
              не будет отправлено в социальные сети.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-muted-ui-foreground">
                Дата
                <input
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-brand-foreground px-3 text-sm text-page-foreground outline-none focus:border-focus/40 focus:ring-4 focus:ring-focus/10"
                  onChange={(event) => setDate(event.target.value)}
                  type="date"
                  value={date}
                />
              </label>
              <label className="text-xs font-semibold text-muted-ui-foreground">
                Время
                <input
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-brand-foreground px-3 text-sm text-page-foreground outline-none focus:border-focus/40 focus:ring-4 focus:ring-focus/10"
                  onChange={(event) => setTime(event.target.value)}
                  type="time"
                  value={time}
                />
              </label>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <QuietButton onClick={() => setScheduleOpen(false)}>
                Отмена
              </QuietButton>
              <Button
                className="rounded-xl bg-brand text-white hover:bg-brand/90"
                disabled={!date || !time}
                onClick={() => {
                  onSchedule(date, time);
                  setScheduleOpen(false);
                }}
                type="button"
              >
                Добавить в план
              </Button>
            </div>
          </div>
        </div>
      )}
    </FactoryCard>
  );
};
