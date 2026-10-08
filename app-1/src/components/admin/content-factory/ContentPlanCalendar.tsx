import { useMemo } from "react";

import { Clock3, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  type FactoryMediaItem,
  type PlanPublication,
} from "@/lib/content-factory/contentFactoryData";

import { ChannelBadge, StatusBadge } from "./ContentFactoryPrimitives";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const calendarDays = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current;
  });
};

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const PlanPostCard = ({
  mediaItems,
  post,
  onOpen,
  onReschedule,
  onCancel,
}: {
  mediaItems: FactoryMediaItem[];
  post: PlanPublication;
  onOpen: (post: PlanPublication) => void;
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
}) => {
  const image = mediaItems.find((item) => item.id === post.imageId);
  return (
    <article className="rounded-xl border border-line bg-brand-foreground p-2">
      <button
        className="flex w-full min-w-0 items-center gap-2 text-left"
        onClick={() => onOpen(post)}
        type="button"
      >
        {image && (
          <img
            alt=""
            className="size-9 shrink-0 rounded-lg object-cover"
            src={image.image}
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] leading-4 font-semibold text-page-foreground">
            {post.title}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-ui-foreground">
            <Clock3 className="size-3" /> {post.time}
          </span>
          {post.postType && (
            <span className="mt-0.5 block truncate text-[10px] text-muted-ui-foreground/80">
              {post.postType}
            </span>
          )}
        </span>
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
        <StatusBadge status={post.status} />
        <div className="flex items-center gap-1">
          {post.channels.slice(0, 3).map((channel) => (
            <ChannelBadge channel={channel} compact key={channel} />
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-1 border-t border-line pt-1.5">
        <button
          aria-label="Перенести публикацию на следующий день"
          className="grid size-7 place-items-center rounded-lg text-muted-ui-foreground/80 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-30"
          disabled={post.sourceStatus === "cancelled"}
          onClick={() => onReschedule(post.id)}
          title="Перенести на следующий день"
          type="button"
        >
          <Clock3 className="size-3.5" />
        </button>
        <button
          aria-label="Отменить публикацию"
          className="grid size-7 place-items-center rounded-lg text-muted-ui-foreground/80 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"
          disabled={post.sourceStatus === "cancelled"}
          onClick={() => onCancel(post.id)}
          title="Отменить"
          type="button"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </article>
  );
};

export const ContentPlanCalendar = ({
  mediaItems,
  month,
  posts,
  onOpen,
  onCreate,
  onReschedule,
  onCancel,
}: {
  mediaItems: FactoryMediaItem[];
  month: Date;
  posts: PlanPublication[];
  onOpen: (post: PlanPublication) => void;
  onCreate: (date: string) => void;
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
}) => {
  const days = useMemo(() => calendarDays(month), [month]);
  const today = new Date();
  const todayKey = toDateKey(today);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[920px]">
        <div className="grid grid-cols-7 border-b border-line bg-page/70">
          {WEEKDAYS.map((day) => (
            <div
              className="px-3 py-2.5 text-center text-xs font-semibold text-muted-ui-foreground"
              key={day}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dateKey = toDateKey(day);
            const dayPosts = posts.filter((post) => post.date === dateKey);
            const outsideMonth = day.getMonth() !== month.getMonth();
            return (
              <div
                className={cn(
                  "group min-h-44 border-r border-b border-line p-2.5 last:border-r-0",
                  outsideMonth && "bg-page/70",
                )}
                key={dateKey}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full text-xs font-semibold",
                      dateKey === todayKey
                        ? "bg-brand text-white"
                        : outsideMonth
                          ? "text-slate-300"
                          : "text-muted-ui-foreground",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {dayPosts.length > 0 && (
                    <span className="text-[10px] text-muted-ui-foreground/80">
                      {dayPosts.length} поста
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {dayPosts.map((post) => (
                    <PlanPostCard
                      key={post.id}
                      mediaItems={mediaItems}
                      onCancel={onCancel}
                      onOpen={onOpen}
                      onReschedule={onReschedule}
                      post={post}
                    />
                  ))}
                  {dayPosts.length === 0 && !outsideMonth && (
                    <button
                      aria-label={`Добавить публикацию на ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(day)}`}
                      className="grid size-7 place-items-center rounded-lg text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-brand/5 hover:text-brand focus:opacity-100"
                      onClick={() => onCreate(dateKey)}
                      type="button"
                    >
                      <Plus className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
