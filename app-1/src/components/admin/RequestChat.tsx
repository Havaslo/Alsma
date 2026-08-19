import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Send } from "lucide-react";

import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

export type RequestChatMessage = {
  readonly id: string;
  readonly conversationId: string;
  readonly author: "guest" | "agent" | "manager";
  readonly text: string;
  readonly createdAt: string;
  readonly bookingUrl?: string;
};

type RequestChatProps = {
  readonly conversationId: string;
  readonly initialMessages: readonly {
    author: "guest" | "manager";
    text: string;
  }[];
};

export const RequestChat = ({
  conversationId,
  initialMessages,
}: RequestChatProps) => {
  const [messages, setMessages] = useState<RequestChatMessage[]>([]);
  const [mode, setMode] = useState<"agent" | "manager">("agent");
  const [managerRequested, setManagerRequested] = useState(false);
  const [agentStopped, setAgentStopped] = useState(false);
  const [agentStatus, setAgentStatus] = useState("");
  const [text, setText] = useState("");
  const adminHeaders = useMemo(
    () => ({ Authorization: `Bearer ${readAdminSession() ?? ""}` }),
    [],
  );

  useEffect(() => {
    const loadMode = () =>
      apiClient
        .get<{ mode: "agent" | "manager"; managerRequested: boolean; agentStopped?: boolean }>(
          "/chat/admin/mode",
          {
            params: { conversationId },
            headers: adminHeaders,
          },
        )
        .then(({ data }) => {
          setMode(data.mode);
          setManagerRequested(data.managerRequested);
          setAgentStopped(Boolean(data.agentStopped));
        });
    void Promise.all([
      apiClient.get<{ items: RequestChatMessage[] }>("/chat/admin/messages", {
        params: { conversationId },
        headers: adminHeaders,
      }),
      apiClient
        .get<{ mode: "agent" | "manager"; managerRequested: boolean; agentStopped?: boolean }>(
          "/chat/admin/mode",
          {
            params: { conversationId },
            headers: adminHeaders,
          },
        )
        .then(({ data }) => {
          setMode(data.mode);
          setManagerRequested(data.managerRequested);
          setAgentStopped(Boolean(data.agentStopped));
        }),
    ]).then(([{ data }]) => {
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
    const modePoll = window.setInterval(loadMode, 2_000);
    const events = new EventSource(
      `/api/chat/admin/stream?conversationId=${encodeURIComponent(conversationId)}&token=${encodeURIComponent(readAdminSession() ?? "")}`,
    );
    events.onmessage = (event) => {
      const eventData = JSON.parse(event.data) as
        RequestChatMessage | { type: "status"; label: string };
      if ("type" in eventData && eventData.type === "status") {
        setAgentStatus(eventData.label);
        return;
      }
      const message = eventData as RequestChatMessage;
      if (message.id)
        setMessages((current) =>
          current.some((item) => item.id === message.id)
            ? current
            : [...current, message],
        );
    };
    return () => {
      window.clearInterval(modePoll);
      events.close();
    };
  }, [adminHeaders, conversationId, initialMessages]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    await apiClient.post(
      "/chat/admin/messages",
      { conversationId, text: value },
      { headers: adminHeaders },
    );
    setMode("manager");
  };

  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-line bg-page/50">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-ui-foreground uppercase">
            Общение по обращению
          </p>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Ответы приходят в реальном времени
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-supporting/30 px-3 py-1 text-xs font-semibold text-supporting-foreground">
            {agentStopped
              ? "Агент остановлен"
              : managerRequested
              ? "Запрошен менеджер"
              : mode === "manager"
                ? "Менеджер отвечает"
                : "AI-агент отвечает"}
          </span>
          {!agentStopped && <button
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold"
            onClick={async () => {
              const nextMode = mode === "manager" ? "agent" : "manager";
              await apiClient.post(
                "/chat/admin/mode",
                { conversationId, mode: nextMode },
                { headers: adminHeaders },
              );
              setMode(nextMode);
              setManagerRequested(false);
            }}
            type="button"
          >
            {mode === "manager" ? "Передать AI" : "Взять диалог"}
          </button>}
        </div>
      </header>
      {agentStatus && mode === "agent" && (
        <p className="border-b border-line px-5 py-3 text-xs font-medium text-muted-ui-foreground">
          {agentStatus}…
        </p>
      )}
      <div className="max-h-96 space-y-3 overflow-y-auto p-5">
        {messages.map((message) => (
          <article
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.author === "manager" ? "ml-auto bg-brand text-brand-foreground" : "bg-brand-foreground"}`}
            key={message.id}
          >
            <p className="mb-1 text-xs font-semibold opacity-70">
              {message.author === "manager"
                ? "Менеджер"
                : message.author === "agent"
                  ? "AI-ассистент"
                  : "Гость"}
            </p>
            <p>{message.text}</p>
          </article>
        ))}
      </div>
      <form className="flex gap-2 border-t border-line p-4" onSubmit={send}>
        <input
          aria-label="Ответ по обращению"
          className="min-w-0 flex-1 rounded-xl border border-line bg-brand-foreground px-4 py-3 text-sm outline-none focus:border-focus"
          onChange={(event) => setText(event.target.value)}
          placeholder={
            mode === "manager"
              ? "Ответ менеджера"
              : "Диалог отвечает AI — напишите, чтобы взять его"
          }
          value={text}
        />
        <button
          aria-label="Отправить ответ"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground"
          type="submit"
        >
          <Send className="size-4" />
        </button>
      </form>
    </section>
  );
};
