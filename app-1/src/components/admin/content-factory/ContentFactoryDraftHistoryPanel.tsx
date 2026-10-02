import { useMemo, useState } from "react";

import { Clock3, FilePenLine, History, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { FactoryMediaItem } from "@/lib/content-factory/contentFactoryData";
import type { SavedContentFactoryDraft } from "@/lib/content-factory/contentFactoryTypes";
import { resolveMediaUrl } from "@/lib/site/media-url";

import { ChannelBadge } from "./ContentFactoryPrimitives";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const ContentFactoryDraftHistoryPanel = ({
  drafts,
  error,
  isLoading,
  mediaItems,
  onOpenDraft,
  onRetry,
}: {
  drafts: SavedContentFactoryDraft[];
  error: string;
  isLoading: boolean;
  mediaItems: FactoryMediaItem[];
  onOpenDraft: (draft: SavedContentFactoryDraft) => void;
  onRetry: () => void;
}) => {
  const [query, setQuery] = useState("");
  const filteredDrafts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    if (!normalized) return drafts;
    return drafts.filter((draft) => {
      const activeVariant =
        draft.snapshot.variants[draft.snapshot.variantIndex] ??
        draft.snapshot.variants[0];
      return `${draft.title} ${draft.snapshot.prompt} ${activeVariant?.text ?? ""}`
        .toLocaleLowerCase("ru-RU")
        .includes(normalized);
    });
  }, [drafts, query]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-brand-foreground p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.13em] text-brand uppercase">
              <History className="size-4" /> История и черновики
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-page-foreground">
              Сохранённые материалы
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-ui-foreground">
              Здесь остаются черновики после закрытия страницы. Откройте любой,
              чтобы продолжить редактирование.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-line bg-page px-3 py-1.5 text-xs font-medium text-muted-ui-foreground">
            {drafts.length} {drafts.length === 1 ? "черновик" : "черновиков"}
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground shadow-[0_8px_30px_rgba(25,45,34,0.045)]">
        <div className="border-b border-line p-4 sm:px-5">
          <label className="relative block min-w-0 sm:max-w-md">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-ui-foreground/80" />
            <input
              className="min-h-10 w-full rounded-xl border border-line bg-page/70 pr-4 pl-10 text-sm transition outline-none placeholder:text-muted-ui-foreground/80 focus:border-focus/40 focus:bg-brand-foreground focus:ring-4 focus:ring-focus/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти черновик…"
              type="search"
              value={query}
            />
          </label>
        </div>

        {isLoading ? (
          <div
            className="p-12 text-center text-sm text-muted-ui-foreground"
            role="status"
          >
            Загружаем сохранённые материалы…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-red-800">{error}</p>
            <Button
              className="rounded-xl bg-brand text-white hover:bg-brand/90"
              onClick={onRetry}
              type="button"
            >
              Загрузить ещё раз
            </Button>
          </div>
        ) : filteredDrafts.length ? (
          <div className="divide-y divide-slate-100">
            {filteredDrafts.map((draft) => {
              const activeVariant =
                draft.snapshot.variants[draft.snapshot.variantIndex] ??
                draft.snapshot.variants[0];
              const image = mediaItems.find(
                (media) => media.id === activeVariant?.imageId,
              );
              return (
                <article
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5"
                  key={draft.id}
                >
                  {image ? (
                    <img
                      alt=""
                      className="size-20 shrink-0 rounded-2xl object-cover"
                      src={resolveMediaUrl(image.image)}
                    />
                  ) : (
                    <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-brand/5 text-brand">
                      <FilePenLine className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-page-foreground sm:text-base">
                        {draft.title || "Без названия"}
                      </h3>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                        Черновик
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-ui-foreground">
                      {activeVariant?.text ||
                        draft.snapshot.prompt ||
                        "Текст пока не добавлен."}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {draft.snapshot.selectedChannels.map((channel) => (
                        <ChannelBadge channel={channel} compact key={channel} />
                      ))}
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-ui-foreground">
                        <Clock3 className="size-3" />{" "}
                        {formatDate(draft.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <Button
                    className={cn(
                      "min-h-10 shrink-0 rounded-xl",
                      "bg-brand-foreground text-page-foreground ring-1 ring-slate-200 hover:bg-page",
                    )}
                    onClick={() => onOpenDraft(draft)}
                    type="button"
                  >
                    Открыть черновик
                  </Button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <FilePenLine className="mx-auto size-7 text-muted-ui-foreground/80" />
            <p className="mt-3 text-sm font-semibold text-page-foreground">
              {query
                ? "Черновики не найдены"
                : "Сохранённых черновиков пока нет"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-ui-foreground">
              В разделе «Создание» нажмите «Сохранить черновик» — материал
              появится здесь и останется доступен после перезагрузки.
            </p>
          </div>
        )}
        {!isLoading && !error && (
          <div className="border-t border-line bg-page/50 px-4 py-3.5 text-xs text-muted-ui-foreground sm:px-5">
            Показаны сохранённые в Фабрике контента черновики ·{" "}
            {filteredDrafts.length} материалов
          </div>
        )}
      </section>
    </div>
  );
};
