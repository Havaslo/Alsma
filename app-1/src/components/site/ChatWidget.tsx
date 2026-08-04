import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";

import { apiClient } from "@/lib/api/api-client";
import { cn } from "@/lib/cn";

export type ChatMessage = {
  id: string;
  conversationId: string;
  author: "guest" | "manager";
  text: string;
  createdAt: string;
};
const STORAGE_KEY = "alsma-chat-conversation";
const getConversationId = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
};

export const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const conversationId = useMemo(() => getConversationId(), []);

  useEffect(() => {
    void apiClient
      .get<{ items: ChatMessage[] }>("/chat/messages", {
        params: { conversationId },
      })
      .then(({ data }) => setMessages(data.items));
    const events = new EventSource(
      `/api/chat/stream?conversationId=${conversationId}`,
    );
    events.onmessage = (event) => {
      const message = JSON.parse(event.data) as ChatMessage;
      if (message.id)
        setMessages((current) =>
          current.some((item) => item.id === message.id)
            ? current
            : [...current, message],
        );
    };
    return () => events.close();
  }, [conversationId]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    const { data } = await apiClient.post<{ message: ChatMessage }>(
      "/chat/messages",
      { conversationId, text: value },
    );
    setMessages((current) =>
      current.some((item) => item.id === data.message.id)
        ? current
        : [...current, data.message],
    );
  };

  return (
    <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {open && (
        <section className="mb-3 flex h-[min(35rem,calc(100vh-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-line bg-brand-foreground shadow-2xl">
          <header className="flex items-center justify-between bg-brand px-5 py-4 text-brand-foreground">
            <div>
              <strong className="block">Помощь АЛСМА</strong>
              <span className="text-xs text-brand-foreground/70">
                Отвечаем в реальном времени
              </span>
            </div>
            <button
              aria-label="Закрыть чат"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-brand-foreground p-4">
            {messages.length === 0 && (
              <p className="rounded-2xl bg-page p-4 text-sm text-muted-ui-foreground">
                Здравствуйте! Напишите вопрос — менеджер скоро ответит.
              </p>
            )}
            {messages.map((message) => (
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                  message.author === "guest"
                    ? "ml-auto bg-brand text-brand-foreground"
                    : "bg-page text-page-foreground",
                )}
                key={message.id}
              >
                {message.text}
              </div>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-line bg-brand-foreground p-3"
            onSubmit={send}
          >
            <input
              aria-label="Сообщение"
              className="min-w-0 flex-1 rounded-xl border border-line bg-page px-3 py-2 text-sm outline-none focus:border-focus"
              onChange={(event) => setText(event.target.value)}
              placeholder="Ваш вопрос"
              value={text}
            />
            <button
              aria-label="Отправить"
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground"
              type="submit"
            >
              <Send className="size-4" />
            </button>
          </form>
        </section>
      )}
      <button
        aria-label={open ? "Закрыть чат" : "Открыть чат"}
        className="ml-auto grid size-14 place-items-center rounded-full bg-brand text-brand-foreground shadow-xl transition hover:scale-105"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <MessageCircle className="size-6" />
      </button>
    </div>
  );
};
