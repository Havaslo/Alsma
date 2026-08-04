import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Send } from "lucide-react";

import { apiClient } from "@/lib/api/api-client";
import { readAdminSession } from "@/lib/admin/admin-session";

export type RequestChatMessage = {
  readonly id: string;
  readonly conversationId: string;
  readonly author: "guest" | "manager";
  readonly text: string;
  readonly createdAt: string;
};

type RequestChatProps = {
  readonly conversationId: string;
  readonly initialMessages: readonly { author: "guest" | "manager"; text: string }[];
};

export const RequestChat = ({ conversationId, initialMessages }: RequestChatProps) => {
  const [messages, setMessages] = useState<RequestChatMessage[]>([]);
  const [text, setText] = useState("");
  const adminHeaders = { Authorization: `Bearer ${readAdminSession() ?? ""}` };

  useEffect(() => {
    void apiClient
      .get<{ items: RequestChatMessage[] }>("/chat/messages", { params: { conversationId } })
      .then(({ data }) => {
        setMessages(
          data.items.length
            ? data.items
            : initialMessages.map((message, index) => ({
                ...message,
                id: `initial-${conversationId}-${index}`,
                conversationId,
                createdAt: new Date(0).toISOString(),
              })),
        );
      });
    const events = new EventSource(`/api/chat/stream?conversationId=${encodeURIComponent(conversationId)}`);
    events.onmessage = (event) => {
      const message = JSON.parse(event.data) as RequestChatMessage;
      if (message.id) setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
    };
    return () => events.close();
  }, [conversationId, initialMessages]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    await apiClient.post("/chat/admin/messages", { conversationId, text: value }, { headers: adminHeaders });
  };

  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-line bg-page/50">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-ui-foreground uppercase">Общение по обращению</p>
          <p className="mt-1 text-sm text-muted-ui-foreground">Ответы приходят в реальном времени</p>
        </div>
        <span className="rounded-full bg-supporting/30 px-3 py-1 text-xs font-semibold text-supporting-foreground">Realtime</span>
      </header>
      <div className="max-h-96 space-y-3 overflow-y-auto p-5">
        {messages.map((message) => (
          <article className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.author === "manager" ? "ml-auto bg-brand text-brand-foreground" : "bg-brand-foreground"}`} key={message.id}>
            <p className="mb-1 text-xs font-semibold opacity-70">{message.author === "manager" ? "Менеджер" : "Гость"}</p>
            <p>{message.text}</p>
          </article>
        ))}
      </div>
      <form className="flex gap-2 border-t border-line p-4" onSubmit={send}>
        <input aria-label="Ответ по обращению" className="min-w-0 flex-1 rounded-xl border border-line bg-brand-foreground px-4 py-3 text-sm outline-none focus:border-focus" onChange={(event) => setText(event.target.value)} placeholder="Ответ менеджера" value={text} />
        <button aria-label="Отправить ответ" className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground" type="submit"><Send className="size-4" /></button>
      </form>
    </section>
  );
};
