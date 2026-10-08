import { Clock3, Edit3, Image, Trash2 } from "lucide-react";

import {
  type FactoryMediaItem,
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
  mediaItems,
  posts,
  onOpen,
  onReschedule,
  onCancel,
}: {
  mediaItems: FactoryMediaItem[];
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
          {mediaItems.find((item) => item.id === post.imageId)?.image ? (
            <img
              alt=""
              className="size-14 shrink-0 rounded-xl object-cover"
              src={mediaItems.find((item) => item.id === post.imageId)?.image}
            />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-page text-muted-ui-foreground">
              <Image className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <button
              className="block truncate text-left text-sm font-semibold text-page-foreground hover:text-brand"
              onClick={() => onOpen(post)}
              type="button"
            >
              {post.title}
            </button>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-ui-foreground">
              <span>{formatShortDate(post.date)}</span>
              <span>·</span>
              <span>{post.time}</span>
              <span className="flex items-center gap-1.5">
                {post.channels.map((channel) => (
                  <ChannelBadge channel={channel} compact key={channel} />
                ))}
              </span>
            </div>
            {post.postType && (
              <p className="mt-1 text-xs text-muted-ui-foreground">
                {post.postType}
                {post.format ? ` · ${post.format}` : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={post.status} />
          <QuietButton onClick={() => onOpen(post)}>
            <Edit3 className="size-3.5" /> Открыть
          </QuietButton>
          {post.sourceStatus !== "cancelled" && (
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
      <div className="p-12 text-center text-sm text-muted-ui-foreground">
        На этот месяц публикаций пока нет.
      </div>
    )}
  </div>
);
