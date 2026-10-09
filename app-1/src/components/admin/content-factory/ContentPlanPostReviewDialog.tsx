import { useState } from "react";

import { Check, LoaderCircle, RefreshCw, Save, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type {
  FactoryMediaItem,
  PlanPublication,
} from "@/lib/content-factory/contentFactoryData";
import { resolveMediaUrl } from "@/lib/site/media-url";

import {
  ChannelBadge,
  QuietButton,
  StatusBadge,
} from "./ContentFactoryPrimitives";

export const ContentPlanPostReviewDialog = ({
  post,
  mediaItems,
  busy = false,
  onClose,
  onSave,
  onApprove,
  onRetry,
}: {
  post: PlanPublication;
  mediaItems: FactoryMediaItem[];
  busy?: boolean;
  onClose: () => void;
  onSave: (input: {
    postId: string;
    date: string;
    time: string;
    title: string;
    text: string;
  }) => Promise<void>;
  onApprove: (postId: string) => Promise<void>;
  onRetry: (postId: string) => Promise<void>;
}) => {
  const [title, setTitle] = useState(post.title);
  const [text, setText] = useState(post.text ?? "");
  const [date, setDate] = useState(post.date);
  const [time, setTime] = useState(post.time);
  const canEdit =
    post.sourceStatus === "needs_review" || post.sourceStatus === "approved";
  const hasChanges =
    title !== post.title ||
    text !== (post.text ?? "") ||
    date !== post.date ||
    time !== post.time;
  const canApprove =
    post.sourceStatus === "needs_review" && text.trim().length > 0;
  const attachedImages = (
    post.imageIds?.length ? post.imageIds : post.imageId ? [post.imageId] : []
  )
    .map((id) => mediaItems.find((item) => item.id === id))
    .filter((item): item is FactoryMediaItem => Boolean(item));

  return (
    <div
      aria-label="Проверка публикации"
      aria-modal="true"
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-line bg-brand-foreground shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-brand-foreground/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={post.status} />
              {post.channels.map((channel) => (
                <ChannelBadge channel={channel} compact key={channel} />
              ))}
              {post.postType && (
                <span className="text-xs text-muted-ui-foreground">
                  {post.postType}
                  {post.format ? ` · ${post.format}` : ""}
                </span>
              )}
            </div>
            <p className="mt-2 truncate text-xs text-muted-ui-foreground">
              {post.importFileName ?? "Контент-план"}
            </p>
          </div>
          <button
            aria-label="Закрыть окно проверки"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-ui-foreground hover:bg-page"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-5 p-5 sm:p-6">
          {post.sourceStatus === "queued" ||
          post.sourceStatus === "generating" ? (
            <p className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm text-blue-800">
              {post.sourceStatus === "queued"
                ? "Пост в очереди на генерацию. Кнопка одобрения станет доступна, когда черновик будет готов."
                : "Агент готовит текст. Это может занять некоторое время; обновлять страницу не требуется."}
            </p>
          ) : null}

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
              Пост одобрен к публикации. Он не отправляется в соцсеть
              автоматически; подключение каналов и отправка потребуют отдельной
              настройки.
            </p>
          )}

          {post.sourceStatus === "cancelled" && (
            <p className="rounded-xl border border-line bg-page px-3.5 py-3 text-sm text-muted-ui-foreground">
              Публикация отменена и больше не участвует в согласовании.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_150px_130px]">
            <label className="text-xs font-semibold text-muted-ui-foreground">
              Заголовок
              <input
                className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-brand-foreground px-3 text-sm font-medium text-page-foreground outline-none focus:border-focus/40 focus:ring-4 focus:ring-focus/10 disabled:bg-page"
                disabled={!canEdit || busy}
                maxLength={255}
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>
            <label className="text-xs font-semibold text-muted-ui-foreground">
              Дата публикации
              <input
                className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-brand-foreground px-3 text-sm text-page-foreground outline-none focus:border-focus/40 focus:ring-4 focus:ring-focus/10 disabled:bg-page"
                disabled={!canEdit || busy}
                onChange={(event) => setDate(event.target.value)}
                type="date"
                value={date}
              />
            </label>
            <label className="text-xs font-semibold text-muted-ui-foreground">
              Время
              <input
                className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-brand-foreground px-3 text-sm text-page-foreground outline-none focus:border-focus/40 focus:ring-4 focus:ring-focus/10 disabled:bg-page"
                disabled={!canEdit || busy}
                onChange={(event) => setTime(event.target.value)}
                type="time"
                value={time}
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-muted-ui-foreground">
            Текст поста
            <textarea
              className="mt-1.5 min-h-52 w-full resize-y rounded-xl border border-line bg-brand-foreground px-3.5 py-3 text-sm leading-6 text-page-foreground outline-none focus:border-focus/40 focus:ring-4 focus:ring-focus/10 disabled:bg-page"
              disabled={!canEdit || busy}
              maxLength={20_000}
              onChange={(event) => setText(event.target.value)}
              value={text}
            />
          </label>

          {attachedImages.length > 0 && (
            <section aria-label="Изображения публикации">
              <h3 className="mb-2 text-xs font-semibold text-muted-ui-foreground">
                Изображения поста · {attachedImages.length}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {attachedImages.map((image, index) => (
                  <figure
                    className="overflow-hidden rounded-xl border border-line bg-page"
                    key={image.id}
                  >
                    <img
                      alt={`Изображение ${index + 1}: ${image.title}`}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                      src={resolveMediaUrl(image.image)}
                    />
                    <figcaption className="truncate px-3 py-2 text-xs text-page-foreground">
                      {index + 1}. {image.title}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <ReadOnlyBrief label="Для кого" value={post.audience} />
            <ReadOnlyBrief label="Факты и условия" value={post.keyFacts} />
            <ReadOnlyBrief label="Призыв / ссылка" value={post.callToAction} />
            <ReadOnlyBrief
              label="Стиль и ограничения"
              value={post.styleGuidance}
            />
            <ReadOnlyBrief
              label="Промт для изображения"
              value={post.imagePrompt}
            />
            <ReadOnlyBrief
              label="Исходное фото"
              value={post.sourceImageRecommendation}
            />
          </div>
          {(post.imagePrompt || post.sourceImageRecommendation) && (
            <p className="text-xs leading-5 text-muted-ui-foreground">
              Промт и подсказка по исходному фото взяты из таблицы; само
              изображение этой генерацией не создавалось.
            </p>
          )}
        </div>

        <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-line bg-brand-foreground/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <QuietButton disabled={busy} onClick={onClose}>
            Закрыть
          </QuietButton>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {canEdit && (
              <QuietButton
                disabled={busy || !hasChanges || !title.trim() || !text.trim()}
                onClick={() =>
                  void onSave({ postId: post.id, date, time, title, text })
                }
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Сохранить правки
              </QuietButton>
            )}
            {canApprove && (
              <Button
                className="min-h-11 rounded-xl bg-brand px-4 text-white hover:bg-brand/90"
                disabled={busy}
                onClick={() => void onApprove(post.id)}
                type="button"
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Одобрить к публикации
              </Button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
};

const ReadOnlyBrief = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <div className="rounded-xl bg-page px-3.5 py-3">
      <p className="text-[11px] font-semibold text-muted-ui-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm leading-5 whitespace-pre-wrap text-page-foreground">
        {value}
      </p>
    </div>
  ) : null;
