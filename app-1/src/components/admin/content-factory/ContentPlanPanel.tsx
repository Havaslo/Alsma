import { useMemo, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  List,
  Plus,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  CONTENT_CHANNELS,
  type PlanPublication,
} from "@/lib/content-factory/contentFactoryData";

import { ChannelBadge } from "./ContentFactoryPrimitives";
import { ContentPlanCalendar } from "./ContentPlanCalendar";
import { ContentPlanList } from "./ContentPlanList";

const monthLabel = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(
    date,
  );

const addDay = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

export const ContentPlanPanel = ({
  posts,
  onPostsChange,
  onGeneratePlan,
  onOpenPost,
}: {
  posts: PlanPublication[];
  onPostsChange: (posts: PlanPublication[]) => void;
  onGeneratePlan: () => void;
  onOpenPost: (post: PlanPublication) => void;
}) => {
  const [month, setMonth] = useState(() => new Date(2026, 9, 1));
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const visiblePosts = useMemo(
    () =>
      posts
        .filter((post) => {
          const postDate = new Date(`${post.date}T12:00:00`);
          return (
            postDate.getFullYear() === month.getFullYear() &&
            postDate.getMonth() === month.getMonth()
          );
        })
        .sort((a, b) =>
          `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
        ),
    [month, posts],
  );
  const summary = [
    {
      label: "Запланировано",
      count: posts.filter((post) => post.status === "Запланировано").length,
    },
    {
      label: "На согласовании",
      count: posts.filter((post) => post.status === "На согласовании").length,
    },
    {
      label: "Черновики",
      count: posts.filter((post) => post.status === "Черновик").length,
    },
  ];

  const shiftMonth = (step: number) => {
    setMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + step, 1),
    );
  };
  const reschedule = (id: string) =>
    onPostsChange(
      posts.map((post) =>
        post.id === id && post.status !== "Опубликовано"
          ? { ...post, date: addDay(post.date) }
          : post,
      ),
    );
  const cancel = (id: string) =>
    onPostsChange(posts.filter((post) => post.id !== id));
  const createOnDate = (date: string) =>
    onOpenPost({
      id: `new-${date}`,
      title: "Новая публикация",
      date,
      time: "12:00",
      channels: ["vk"],
      status: "Черновик",
      imageId: "spa-pool",
    });

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-brand-foreground p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.13em] text-brand uppercase">
            <CalendarDays className="size-4" /> Контент-план
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-page-foreground">
            Все публикации — в одном расписании
          </h2>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Просматривайте каналы, сроки и статус материалов.
          </p>
        </div>
        <Button
          className="min-h-11 shrink-0 rounded-xl bg-brand text-white hover:bg-brand/90"
          onClick={onGeneratePlan}
          type="button"
        >
          <Sparkles className="size-4" /> Сгенерировать контент-план
        </Button>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {summary.map(({ label, count }) => (
          <div
            className="rounded-2xl border border-line bg-brand-foreground px-4 py-3.5"
            key={label}
          >
            <p className="text-xs font-medium text-muted-ui-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-page-foreground">
              {count}
            </p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground shadow-[0_8px_30px_rgba(25,45,34,0.045)]">
        <div className="flex flex-col gap-4 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            <button
              aria-label="Предыдущий месяц"
              className="grid size-9 place-items-center rounded-xl border border-line text-muted-ui-foreground transition hover:bg-page"
              onClick={() => shiftMonth(-1)}
              type="button"
            >
              <ArrowLeft className="size-4" />
            </button>
            <h3 className="min-w-40 text-center text-lg font-semibold text-page-foreground capitalize">
              {monthLabel(month)}
            </h3>
            <button
              aria-label="Следующий месяц"
              className="grid size-9 place-items-center rounded-xl border border-line text-muted-ui-foreground transition hover:bg-page"
              onClick={() => shiftMonth(1)}
              type="button"
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 sm:flex">
              {CONTENT_CHANNELS.map((channel) => (
                <ChannelBadge channel={channel.id} compact key={channel.id} />
              ))}
            </div>
            <div className="flex rounded-xl border border-line bg-page p-1">
              <button
                aria-label="Календарь"
                aria-pressed={view === "calendar"}
                className={cn(
                  "grid size-8 place-items-center rounded-lg transition",
                  view === "calendar"
                    ? "bg-brand-foreground text-brand shadow-sm"
                    : "text-muted-ui-foreground hover:text-page-foreground",
                )}
                onClick={() => setView("calendar")}
                type="button"
              >
                <CalendarDays className="size-4" />
              </button>
              <button
                aria-label="Список публикаций"
                aria-pressed={view === "list"}
                className={cn(
                  "grid size-8 place-items-center rounded-lg transition",
                  view === "list"
                    ? "bg-brand-foreground text-brand shadow-sm"
                    : "text-muted-ui-foreground hover:text-page-foreground",
                )}
                onClick={() => setView("list")}
                type="button"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {view === "calendar" ? (
          <ContentPlanCalendar
            month={month}
            onCancel={cancel}
            onCreate={createOnDate}
            onOpen={onOpenPost}
            onReschedule={reschedule}
            posts={visiblePosts}
          />
        ) : (
          <ContentPlanList
            onCancel={cancel}
            onOpen={onOpenPost}
            onReschedule={reschedule}
            posts={visiblePosts}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-page/50 px-4 py-3.5 text-xs text-muted-ui-foreground sm:px-5">
          <span>Показано {visiblePosts.length} материалов · демо-данные</span>
          <span className="inline-flex items-center gap-1.5">
            <Plus className="size-3.5" /> Нажмите на карточку, чтобы открыть
            материал
          </span>
        </div>
      </section>
    </div>
  );
};
