import { BotMessageSquare } from "lucide-react";

import type { ChatMessage } from "@/components/chat/chat-types";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

export type ChatMessageItemProps = {
  readonly assistantName?: string;
  readonly message: ChatMessage;
  readonly userName?: string;
};

export const ChatMessageItem = ({
  assistantName = "Assistant",
  message,
  userName = "You",
}: ChatMessageItemProps) => {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const label = isUser ? userName : assistantName;

  if (isSystem) {
    return (
      <p className="mx-auto max-w-lg rounded-full border border-border/50 bg-muted/50 px-4 py-2 text-center text-xs text-muted-foreground">
        {message.content}
      </p>
    );
  }

  return (
    <article
      className={cn(
        "flex max-w-3xl items-end gap-3",
        isUser && "ml-auto flex-row-reverse",
      )}
    >
      {isUser ? (
        <Avatar alt={label} className="size-8" />
      ) : (
        <Avatar alt={label} className="size-8 text-primary">
          <BotMessageSquare aria-hidden="true" className="size-4" />
        </Avatar>
      )}
      <div
        className={cn(
          "grid min-w-0 gap-1 rounded-2xl border px-4 py-3 shadow-sm shadow-foreground/5",
          isUser
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border/70 bg-surface/90 text-surface-foreground",
        )}
      >
        <span
          className={cn(
            "text-xs font-semibold",
            isUser ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <p className="text-sm leading-6 whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </article>
  );
};
