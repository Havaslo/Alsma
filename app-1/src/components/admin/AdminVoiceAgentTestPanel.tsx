import { useEffect, useRef, useState } from "react";

import { Bot, RotateCcw, Send, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { readAdminSession } from "@/lib/admin/admin-session";
import { apiUrl } from "@/lib/api/api-base-url";

type Message = { role: "admin" | "agent"; text: string };

export const AdminVoiceAgentTestPanel = () => {
  const socket = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Подключаем тестовый канал…");
  const [streaming, setStreaming] = useState(false);

  const connect = () => {
    socket.current?.close();
    setMessages([]);
    setStatus("Подключаем тестовый канал…");
    const url = new URL(apiUrl("/admin/voice-agent/realtime"));
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const current = new WebSocket(url.toString());
    socket.current = current;
    current.onopen = () =>
      current.send(JSON.stringify({ type: "auth", token: readAdminSession() }));
    current.onmessage = (event) => {
      const data = JSON.parse(event.data) as {
        type?: string;
        delta?: string;
        message?: string;
      };
      if (data.type === "alsma.admin.realtime.connected")
        setStatus("Канал готов");
      if (data.type === "response.output_text.delta" && data.delta) {
        setStreaming(true);
        setMessages((items) => {
          const last = items.at(-1);
          if (last?.role === "agent")
            return [
              ...items.slice(0, -1),
              { ...last, text: last.text + data.delta },
            ];
          return [...items, { role: "agent", text: data.delta! }];
        });
      }
      if (data.type === "response.done") {
        setStreaming(false);
        setStatus("Канал готов");
      }
      if (data.type === "alsma.admin.realtime.error") {
        setStreaming(false);
        setStatus(data.message ?? "Тестовый канал недоступен.");
      }
    };
    current.onerror = () => setStatus("Не удалось подключить тестовый канал.");
    current.onclose = () => setStreaming(false);
  };

  useEffect(() => () => socket.current?.close(), []);
  useEffect(() => {
    const timer = window.setTimeout(connect, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const send = () => {
    const text = draft.trim();
    if (!text || socket.current?.readyState !== WebSocket.OPEN) return;
    setMessages((items) => [...items, { role: "admin", text }]);
    socket.current.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      }),
    );
    socket.current.send(JSON.stringify({ type: "response.create" }));
    setDraft("");
    setStreaming(true);
    setStatus("Агент отвечает…");
  };

  return (
    <div className="space-y-5">
      <section>
        <p className="text-sm font-semibold tracking-[0.2em] text-brand/60 uppercase">
          Realtime console
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-brand">
          Тестовый звонок с агентом
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-ui-foreground">
          Обычный чат поверх того же realtime-сценария, который используется для
          звонка. Сессия живёт, пока открыта эта страница.
        </p>
      </section>
      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground shadow-sm">
        <div className="flex items-center justify-between border-b border-line bg-panel/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-brand text-brand-foreground">
              <Bot className="size-5" />
            </span>
            <div>
              <strong className="block text-brand">ALSMA Voice Agent</strong>
              <span className="text-xs text-muted-ui-foreground">{status}</span>
            </div>
          </div>
          <Button onClick={connect} variant="secondary">
            <RotateCcw className="size-4" /> Новый чат
          </Button>
        </div>
        <div className="min-h-96 space-y-4 p-5">
          {messages.length === 0 && (
            <div className="grid min-h-72 place-items-center text-center text-sm text-muted-ui-foreground">
              <div>
                <ShieldCheck className="mx-auto mb-3 size-8 text-brand" />
                <p>Напишите сообщение, чтобы начать тестовый разговор.</p>
                <p className="mt-1 text-xs">
                  Ответы генерируются живым realtime-агентом.
                </p>
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              className={
                message.role === "admin"
                  ? "ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-brand px-4 py-3 text-sm text-brand-foreground"
                  : "max-w-[80%] rounded-2xl rounded-bl-md bg-page px-4 py-3 text-sm"
              }
              key={`${index}-${message.text.slice(0, 8)}`}
            >
              {message.text}
            </div>
          ))}
          {streaming && messages.at(-1)?.role === "admin" && (
            <div className="text-xs text-muted-ui-foreground">
              Агент печатает…
            </div>
          )}
        </div>
        <form
          className="flex gap-3 border-t border-line p-4"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <input
            aria-label="Сообщение агенту"
            className="field-control"
            disabled={streaming}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Например: какие услуги доступны?"
            value={draft}
          />
          <Button disabled={!draft.trim() || streaming} type="submit">
            <Send className="size-4" /> Отправить
          </Button>
        </form>
      </section>
    </div>
  );
};
