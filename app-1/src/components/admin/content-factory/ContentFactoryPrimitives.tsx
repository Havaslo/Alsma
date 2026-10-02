import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";

import { Check, ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  CONTENT_CHANNELS,
  type ContentChannel,
  type PlanStatus,
} from "@/lib/content-factory/contentFactoryData";

const channelTone: Record<ContentChannel, string> = {
  vk: "bg-blue-50 text-blue-700 ring-blue-100",
  telegram: "bg-sky-50 text-sky-700 ring-sky-100",
  max: "bg-violet-50 text-violet-700 ring-violet-100",
  instagram: "bg-pink-50 text-pink-700 ring-pink-100",
  zen: "bg-orange-50 text-orange-800 ring-orange-100",
};

export const ChannelBadge = ({
  channel,
  compact = false,
}: {
  channel: ContentChannel;
  compact?: boolean;
}) => {
  const item = CONTENT_CHANNELS.find((option) => option.id === channel);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        channelTone[channel],
      )}
    >
      {compact ? item?.shortLabel : item?.label}
    </span>
  );
};

export const StatusBadge = ({ status }: { status: PlanStatus }) => {
  const tone: Record<PlanStatus, string> = {
    Черновик: "bg-muted-ui/50 text-page-foreground",
    "На согласовании": "bg-amber-50 text-amber-800",
    Запланировано: "bg-blue-50 text-blue-700",
    Опубликовано: "bg-brand/5 text-brand",
    Ошибка: "bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        tone[status],
      )}
    >
      {status}
    </span>
  );
};

export const FactoryCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      "rounded-3xl border border-line bg-brand-foreground shadow-[0_8px_30px_rgba(25,45,34,0.045)]",
      className,
    )}
  >
    {children}
  </section>
);

export const FactoryNotice = ({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) => (
  <div
    className="flex items-start justify-between gap-3 rounded-2xl border border-brand/10 bg-brand/5 px-4 py-3 text-sm text-brand"
    role="status"
  >
    <p>{children}</p>
    <button
      aria-label="Закрыть уведомление"
      className="rounded-lg p-1 text-brand transition hover:bg-brand/10"
      onClick={onClose}
      type="button"
    >
      <X className="size-4" />
    </button>
  </div>
);

export const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <span className="mb-1.5 block text-xs font-semibold text-muted-ui-foreground">
        {label}
      </span>
      <button
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-line bg-brand-foreground px-3.5 py-2.5 text-left text-sm font-medium text-page-foreground transition outline-none hover:border-slate-300 focus-visible:ring-4 focus-visible:ring-emerald-700/10"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {value}
        <ChevronDown
          className={cn(
            "size-4 text-muted-ui-foreground/80 transition",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          aria-label={label}
          className="absolute z-20 mt-1.5 w-full rounded-xl border border-line bg-brand-foreground p-1.5 shadow-xl shadow-slate-900/10"
          role="listbox"
        >
          {options.map((option) => (
            <button
              aria-selected={option === value}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-page-foreground transition hover:bg-page"
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              {option}
              {option === value && <Check className="size-4 text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const QuietButton = ({
  children,
  className,
  ...props
}: ComponentProps<typeof Button>) => (
  <Button
    variant="secondary"
    className={cn(
      "min-h-10 rounded-xl border-line bg-brand-foreground px-3.5 py-2 text-page-foreground shadow-none hover:border-slate-300 hover:bg-page",
      className,
    )}
    {...props}
  >
    {children}
  </Button>
);
