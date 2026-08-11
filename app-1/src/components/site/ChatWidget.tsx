import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import { MessageCircle, Send, X } from "lucide-react";

import { apiUrl } from "@/lib/api/api-base-url";
import { apiClient } from "@/lib/api/api-client";
import { cn } from "@/lib/cn";

export type ChatMessage = {
  id: string;
  conversationId: string;
  author: "guest" | "manager";
  text: string;
  createdAt: string;
  bookingUrl?: string;
};
type Identity = { requester: string; contact: string };
const STORAGE_KEY = "alsma-chat-conversation";
const IDENTITY_KEY = "alsma-chat-identity";
const LAST_READ_KEY = "alsma-chat-last-read";
const getConversationId = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
};
const getIdentity = (): Identity | null => {
  const value = localStorage.getItem(IDENTITY_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as Identity;
  } catch {
    return null;
  }
};

export const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [agentTyping, setAgentTyping] = useState(false);
  const [text, setText] = useState("");
  const [identity, setIdentity] = useState<Identity | null>(() =>
    getIdentity(),
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const conversationId = useMemo(() => getConversationId(), []);
  const openRef = useRef(false);
  const audioContext = useRef<AudioContext | undefined>(undefined);
  const knownIds = useRef(new Set<string>());
  const playNotificationSound = () => {
    try {
      const context = audioContext.current ?? new AudioContext();
      audioContext.current = context;
      void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        660,
        context.currentTime + 0.12,
      );
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.21);
    } catch {
      /* Audio is optional. */
    }
  };
  const receive = (incoming: ChatMessage) => {
    if (incoming.author === "manager") setAgentTyping(false);
    if (!incoming.id || knownIds.current.has(incoming.id)) return;
    knownIds.current.add(incoming.id);
    setMessages((current) =>
      current.some((item) => item.id === incoming.id)
        ? current
        : [...current, incoming],
    );
    if (incoming.author === "manager" && !openRef.current) {
      setUnread((current) => current + 1);
      playNotificationSound();
    }
  };
  useEffect(() => {
    let ready = false;
    const load = async () => {
      const { data } = await apiClient.get<{ items: ChatMessage[] }>(
        "/chat/messages",
        { params: { conversationId } },
      );
      if (!ready) {
        data.items.forEach((item) => knownIds.current.add(item.id));
        setMessages(data.items);
        const managerMessages = data.items.filter(
          (item) => item.author === "manager",
        );
        const lastRead = localStorage.getItem(
          `${LAST_READ_KEY}-${conversationId}`,
        );
        if (managerMessages.length && managerMessages.at(-1)?.id !== lastRead)
          setUnread(managerMessages.length);
        ready = true;
      } else data.items.forEach(receive);
    };
    void load();
    const poll = window.setInterval(() => void load(), 2_000);
    const events = new EventSource(
      apiUrl(
        `/api/chat/stream?conversationId=${encodeURIComponent(conversationId)}`,
      ),
    );
    events.onmessage = (event) =>
      receive(JSON.parse(event.data) as ChatMessage);
    return () => {
      window.clearInterval(poll);
      events.close();
    };
  }, [conversationId]);
  const openChat = () => {
    openRef.current = true;
    setOpen(true);
    setUnread(0);
    const lastManager = [...messages]
      .reverse()
      .find((message) => message.author === "manager");
    if (lastManager)
      localStorage.setItem(
        `${LAST_READ_KEY}-${conversationId}`,
        lastManager.id,
      );
    try {
      audioContext.current = audioContext.current ?? new AudioContext();
      void audioContext.current.resume();
    } catch {
      /* Audio is optional. */
    }
  };
  const closeChat = () => {
    openRef.current = false;
    setOpen(false);
  };
  const saveIdentity = (event: FormEvent) => {
    event.preventDefault();
    const next = { requester: name.trim(), contact: phone.trim() };
    if (next.requester.length < 2 || next.contact.length < 3) return;
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(next));
    setIdentity(next);
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !identity) return;
    setText("");
    setAgentTyping(true);
    const temporaryId = `sending-${Date.now()}`;
    const temporaryMessage: ChatMessage = {
      id: temporaryId,
      conversationId,
      author: "guest",
      text: value,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, temporaryMessage]);
    try {
      const { data } = await apiClient.post<{ message: ChatMessage }>(
        "/chat/messages",
        {
          conversationId,
          contact: identity.contact,
          requester: identity.requester,
          text: value,
        },
      );
      knownIds.current.add(data.message.id);
      setMessages((current) => [
        ...current.filter(
          (message) =>
            message.id !== temporaryId && message.id !== data.message.id,
        ),
        data.message,
      ]);
    } catch {
      setAgentTyping(false);
      setMessages((current) =>
        current.filter((message) => message.id !== temporaryId),
      );
      setText(value);
    }
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
            <button aria-label="Закрыть чат" onClick={closeChat} type="button">
              <X className="size-5" />
            </button>
          </header>
          {!identity ? (
            <form
              className="flex flex-1 flex-col justify-center gap-3 bg-brand-foreground p-5"
              onSubmit={saveIdentity}
            >
              <p className="text-sm text-muted-ui-foreground">
                Чтобы начать диалог, оставьте имя и телефон.
              </p>
              <input
                className="field-control"
                onChange={(event) => setName(event.target.value)}
                placeholder="Ваше имя"
                value={name}
              />
              <input
                className="field-control"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Телефон"
                value={phone}
              />
              <button
                className="rounded-xl bg-brand px-4 py-3 font-semibold text-brand-foreground"
                type="submit"
              >
                Начать чат
              </button>
            </form>
          ) : (
            <>
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
                    <p>{message.text}</p>
                    {message.bookingUrl && (
                      <a
                        className="mt-3 inline-flex rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground no-underline"
                        href={message.bookingUrl}
                      >
                        Открыть бронирование
                      </a>
                    )}
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
            </>
          )}
        </section>
      )}
      {!open && (
        <button
          aria-label="Открыть чат"
          className="relative ml-auto grid size-14 place-items-center rounded-full bg-brand text-brand-foreground shadow-xl"
          onClick={openChat}
          type="button"
        >
          <MessageCircle className="size-6" />
          {unread > 0 && (
            <span
              aria-label={`${unread} новых сообщений`}
              className="absolute top-0 right-0 size-3.5 rounded-full border-2 border-page bg-destructive"
            />
          )}
        </button>
      )}
    </div>
  );
};
