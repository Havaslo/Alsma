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
      <p className="mx-auto max-w-lg rounded-full border border-line/50 bg-muted-ui/50 px-4 py-2 text-center text-xs text-muted-ui-foreground">
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
        <Avatar alt={label} className="size-8 text-brand">
          <BotMessageSquare aria-hidden="true" className="size-4" />
        </Avatar>
      )}
      <div
        className={cn(
          "grid min-w-0 gap-1 rounded-2xl border px-4 py-3 shadow-sm shadow-page-foreground/5",
          isUser
            ? "border-brand bg-brand text-brand-foreground"
            : "border-line/70 bg-panel/90 text-panel-foreground",
        )}
      >
        <span
          className={cn(
            "text-xs font-semibold",
            isUser ? "text-brand-foreground/80" : "text-muted-ui-foreground",
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
