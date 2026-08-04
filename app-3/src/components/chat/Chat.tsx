import { useEffect, useRef } from "react";

import { MessageSquare } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageItem } from "@/components/chat/ChatMessageItem";
import type {
  ChatMessage,
  ChatSubmitInput,
} from "@/components/chat/chat-types";

export type ChatProps = {
  readonly assistantName?: string;
  readonly isSending?: boolean;
  readonly messages: readonly ChatMessage[];
  readonly onSubmit: (input: ChatSubmitInput) => Promise<void> | void;
  readonly title?: string;
  readonly userName?: string;
};

export const Chat = ({
  assistantName = "Assistant",
  isSending = false,
  messages,
  onSubmit,
  title = "Chat",
  userName = "You",
}: ChatProps) => {
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyRef.current?.scrollTo({
      behavior: "smooth",
      top: historyRef.current.scrollHeight,
    });
  }, [isSending, messages]);

  return (
    <section className="grid h-[36rem] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-3xl border border-border/70 bg-surface/80 text-surface-foreground shadow-sm shadow-foreground/5">
      <header className="border-b border-border/60 px-5 py-4 font-primary font-semibold tracking-tight">
        {title}
      </header>
      <div
        className="min-h-0 overflow-y-auto bg-muted/10 p-4 sm:p-5"
        ref={historyRef}
      >
        {messages.length ? (
          <div className="grid gap-4">
            {messages.map((message) => (
              <ChatMessageItem
                assistantName={assistantName}
                key={message.id}
                message={message}
                userName={userName}
              />
            ))}
            {isSending && (
              <p className="text-sm text-muted-foreground" role="status">
                {assistantName} is responding…
              </p>
            )}
          </div>
        ) : (
          <EmptyState
            className="h-full content-center"
            description="Send a message to start the conversation."
            icon={MessageSquare}
            title="No messages yet"
          />
        )}
      </div>
      <ChatComposer isSending={isSending} onSubmit={onSubmit} />
    </section>
  );
};
