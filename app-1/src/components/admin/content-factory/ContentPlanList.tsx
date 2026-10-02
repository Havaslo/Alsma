import { Clock3, Edit3, Trash2 } from "lucide-react";

import {
  MEDIA_ITEMS,
  type PlanPublication,
} from "@/lib/content-factory/contentFactoryData";

import {
  ChannelBadge,
  QuietButton,
  StatusBadge,
} from "./ContentFactoryPrimitives";

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(
    new Date(`${value}T12:00:00`),
  );

export const ContentPlanList = ({
  posts,
  onOpen,
  onReschedule,
  onCancel,
}: {
  posts: PlanPublication[];
  onOpen: (post: PlanPublication) => void;
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
}) => (
  <div className="divide-y divide-slate-100">
    {posts.map((post) => (
      <div
        className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5"
        key={post.id}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <img
            alt=""
            className="size-14 shrink-0 rounded-xl object-cover"
            src={MEDIA_ITEMS.find((item) => item.id === post.imageId)?.image}
          />
          <div className="min-w-0">
            <button
              className="block truncate text-left text-sm font-semibold text-slate-800 hover:text-emerald-800"
              onClick={() => onOpen(post)}
              type="button"
            >
              {post.title}
            </button>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{formatShortDate(post.date)}</span>
              <span>·</span>
              <span>{post.time}</span>
              <span className="flex items-center gap-1.5">
                {post.channels.map((channel) => (
                  <ChannelBadge channel={channel} compact key={channel} />
                ))}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={post.status} />
          <QuietButton onClick={() => onOpen(post)}>
            <Edit3 className="size-3.5" /> Открыть
          </QuietButton>
          {post.status !== "Опубликовано" && (
            <>
              <QuietButton onClick={() => onReschedule(post.id)}>
                <Clock3 className="size-3.5" /> Перенести
              </QuietButton>
              <QuietButton
                className="text-rose-700 hover:bg-rose-50"
                onClick={() => onCancel(post.id)}
              >
                <Trash2 className="size-3.5" /> Отменить
              </QuietButton>
            </>
          )}
        </div>
      </div>
    ))}
    {posts.length === 0 && (
      <div className="p-12 text-center text-sm text-slate-500">
        На этот месяц публикаций пока нет.
      </div>
    )}
  </div>
);
