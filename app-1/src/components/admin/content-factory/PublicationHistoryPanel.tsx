import { useMemo, useState } from "react";

import {
  ChevronDown,
  ChevronUp,
  Eye,
  History,
  MousePointerClick,
  Search,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/cn";
import {
  CONTENT_CHANNELS,
  type ContentChannel,
  DEMO_HISTORY,
  MEDIA_ITEMS,
} from "@/lib/content-factory/contentFactoryData";

import { ChannelBadge } from "./ContentFactoryPrimitives";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));

export const PublicationHistoryPanel = () => {
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ContentChannel | "all">(
    "all",
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    return DEMO_HISTORY.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.title.toLocaleLowerCase("ru-RU").includes(normalized);
      const matchesChannel =
        channelFilter === "all" || item.channels.includes(channelFilter);
      return matchesQuery && matchesChannel;
    });
  }, [channelFilter, query]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.13em] text-emerald-800 uppercase">
              <History className="size-4" /> История публикаций
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Опубликованный контент
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Смотрите версии и основные показатели материалов по каналам.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-[420px]">
            {[
              ["Постов", "24"],
              ["Средний отклик", "6,4%"],
              ["Переходов", "1 286"],
            ].map(([label, value]) => (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-3"
                key={label}
              >
                <p className="text-[10px] font-medium text-slate-500 sm:text-xs">
                  {label}
                </p>
                <p className="mt-1 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(25,45,34,0.045)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <label className="relative block min-w-0 flex-1 sm:max-w-sm">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-4 pl-10 text-sm transition outline-none placeholder:text-slate-400 focus:border-emerald-700/40 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти публикацию…"
              type="search"
              value={query}
            />
          </label>
          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
            <button
              aria-pressed={channelFilter === "all"}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold",
                channelFilter === "all"
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
              onClick={() => setChannelFilter("all")}
              type="button"
            >
              Все каналы
            </button>
            {CONTENT_CHANNELS.map((channel) => (
              <button
                aria-pressed={channelFilter === channel.id}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold",
                  channelFilter === channel.id
                    ? "border-emerald-800 bg-emerald-800 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
                key={channel.id}
                onClick={() => setChannelFilter(channel.id)}
                type="button"
              >
                {channel.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((item) => {
            const image = MEDIA_ITEMS.find(
              (media) => media.id === item.imageId,
            );
            const expanded = expandedId === item.id;
            return (
              <article className="p-4 sm:p-5" key={item.id}>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(310px,0.8fr)] xl:items-center">
                  <div className="flex min-w-0 items-center gap-3.5">
                    {image && (
                      <img
                        alt=""
                        className="size-16 shrink-0 rounded-2xl object-cover sm:size-20"
                        src={image.image}
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Опубликовано {formatDate(item.date)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.channels.map((channel) => (
                          <ChannelBadge channel={channel} key={channel} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <UsersRound className="size-3.5 text-slate-400" />
                        <span>
                          <span className="font-semibold text-slate-900">
                            {item.reach}
                          </span>{" "}
                          охват
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <TrendingUp className="size-3.5 text-slate-400" />
                        <span>
                          <span className="font-semibold text-slate-900">
                            {item.engagement}
                          </span>{" "}
                          отклик
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MousePointerClick className="size-3.5 text-slate-400" />
                        <span>
                          <span className="font-semibold text-slate-900">
                            {item.clicks}
                          </span>{" "}
                          переходов
                        </span>
                      </div>
                    </div>
                    <button
                      aria-expanded={expanded}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                      type="button"
                    >
                      <Eye className="size-3.5" /> Версии для каналов
                      {expanded ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-3">
                    {Object.entries(item.versions).map(([channel, text]) => (
                      <div
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5"
                        key={channel}
                      >
                        <ChannelBadge channel={channel as ContentChannel} />
                        <p className="mt-2 text-xs leading-5 whitespace-pre-line text-slate-700">
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-12 text-center text-sm text-slate-500">
              Публикаций с такими параметрами нет.
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3.5 text-xs text-slate-500 sm:px-5">
          <span>Показаны демонстрационные публикации и показатели</span>
          <span>{filtered.length} материала</span>
        </div>
      </section>
    </div>
  );
};
