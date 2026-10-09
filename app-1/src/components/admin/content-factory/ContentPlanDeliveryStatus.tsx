import { useState } from "react";

import {
  CalendarClock,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { PlanPublication } from "@/lib/content-factory/contentFactoryData";
import type { ContentPlanPublishingStatus } from "@/lib/content-factory/contentFactoryTypes";

import { QuietButton } from "./ContentFactoryPrimitives";

type Props = {
  post: PlanPublication;
  busy: boolean;
  date: string;
  time: string;
  primaryChannel?: string;
  channelReady: boolean;
  publishingStatus: ContentPlanPublishingStatus | null;
  hasChanges: boolean;
  showScheduleConfirmation: boolean;
  onShowScheduleConfirmationChange: (show: boolean) => void;
  onSchedule: (postId: string) => Promise<void>;
  onRetry: (postId: string) => Promise<void>;
};

export const ContentPlanDeliveryStatus = ({
  post,
  busy,
  date,
  time,
  primaryChannel,
  channelReady,
  publishingStatus,
  hasChanges,
  showScheduleConfirmation,
  onShowScheduleConfirmationChange,
  onSchedule,
  onRetry,
}: Props) => {
  const [isScheduling, setIsScheduling] = useState(false);

  return (
    <>
      {(post.sourceStatus === "queued" ||
        post.sourceStatus === "generating") && (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm text-blue-800">
          {post.sourceStatus === "queued"
            ? "Пост в очереди на генерацию. Кнопка одобрения станет доступна, когда черновик будет готов."
            : "Агент готовит текст. Это может занять некоторое время; обновлять страницу не требуется."}
        </p>
      )}

      {post.sourceStatus === "generation_failed" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
          <p>{post.generationError || "Не удалось создать текст поста."}</p>
          <Button
            className="mt-3 min-h-9 rounded-lg bg-rose-700 px-3 text-white hover:bg-rose-800"
            disabled={busy}
            onClick={() => void onRetry(post.id)}
            type="button"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Повторить генерацию
          </Button>
        </div>
      )}

      {post.sourceStatus === "approved" && (
        <p className="rounded-xl border border-brand/15 bg-brand/5 px-3.5 py-3 text-sm text-brand">
          Пост одобрен, но ещё не отправлен. Чтобы публикация вышла по
          указанному времени, отдельно включите для неё расписание ниже.
        </p>
      )}

      {post.sourceStatus === "scheduled" && (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm text-blue-800">
          Пост поставлен в расписание на {post.date} в {post.time} по
          московскому времени. До отправки его можно снять с расписания.
        </p>
      )}

      {post.sourceStatus === "publishing" && (
        <p className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm text-blue-800">
          <LoaderCircle className="size-4 animate-spin" /> Публикуем пост…
        </p>
      )}

      {post.sourceStatus === "published" && (
        <div className="rounded-xl border border-brand/15 bg-brand/5 px-3.5 py-3 text-sm text-brand">
          <p>
            Опубликовано
            {post.publishedAt
              ? ` ${new Date(post.publishedAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`
              : ""}
            .
          </p>
          {post.publishedUrl && (
            <a
              className="mt-2 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
              href={post.publishedUrl}
              rel="noreferrer"
              target="_blank"
            >
              Открыть публикацию <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      )}

      {post.sourceStatus === "publish_failed" && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
          {post.publicationError || "Пост не удалось опубликовать."} Можно
          исправить дату или время и одобрить его повторно.
        </p>
      )}

      {post.sourceStatus === "publish_unknown" && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
          {post.publicationError ||
            "Соцсеть не подтвердила результат отправки."}{" "}
          Проверьте публикацию в канале; автоматический повтор отключён, чтобы
          не создать дубликат.
        </p>
      )}

      {(post.sourceStatus === "approved" ||
        post.sourceStatus === "publish_failed") &&
        publishingStatus?.enabled === false && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
            Автоматическая отправка включится после публикации изменений на
            основном сайте. Сейчас это окно работает в предпросмотре; одобренные
            посты не отправляются автоматически.
          </p>
        )}

      {(post.sourceStatus === "approved" ||
        post.sourceStatus === "publish_failed") &&
        publishingStatus?.enabled === true &&
        !channelReady && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
            {primaryChannel === "max"
              ? "Для MAX ещё не выбран канал публикации. Добавьте MAX-бота администратором целевого канала с правом публикации; адрес канала будет определён через подключённый webhook."
              : primaryChannel === "vk"
                ? "Публикация в VK пока не настроена."
                : "Автоматическая отправка пока доступна только для VK и MAX."}
          </p>
        )}

      {(post.sourceStatus === "approved" ||
        post.sourceStatus === "publish_failed") &&
        hasChanges && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
            Сначала сохраните изменения и снова одобрите пост. Только после
            этого его можно будет поставить в расписание.
          </p>
        )}

      {showScheduleConfirmation && (
        <div
          className="rounded-xl border border-brand/20 bg-brand/5 px-3.5 py-3 text-sm text-page-foreground"
          role="alert"
        >
          <p className="font-semibold">Поставить пост в расписание?</p>
          <p className="mt-1 leading-5">
            Пост будет опубликован в {primaryChannel?.toUpperCase()} {date} в{" "}
            {time} по московскому времени. Подтверждая, вы разрешаете отправить
            его в указанный канал в это время.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <QuietButton
              disabled={isScheduling}
              onClick={() => onShowScheduleConfirmationChange(false)}
            >
              Не сейчас
            </QuietButton>
            <Button
              className="min-h-9 rounded-xl bg-brand px-3 text-white hover:bg-brand/90"
              disabled={isScheduling}
              onClick={() => {
                setIsScheduling(true);
                void onSchedule(post.id)
                  .catch(() => undefined)
                  .finally(() => setIsScheduling(false));
              }}
              type="button"
            >
              {isScheduling ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <CalendarClock className="size-4" />
              )}
              Да, запланировать
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
