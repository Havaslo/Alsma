import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Send } from "lucide-react";

import { apiClient } from "@/lib/api/api-client";
import { readAdminSession } from "@/lib/admin/admin-session";
import type { ChatMessage } from "@/components/site/ChatWidget";

export const AdminChatPanel = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [text, setText] = useState("");
  useEffect(() => {
    void apiClient.get<{ items: ChatMessage[] }>("/chat/admin/messages", { headers: { Authorization: `Bearer ${readAdminSession() ?? ""}` } }).then(({ data }) => { setMessages(data.items); setConversationId(data.items.at(-1)?.conversationId); });
  }, []);
  useEffect(() => {
    if (!conversationId) return;
    const token = encodeURIComponent(readAdminSession() ?? "");
    const events = new EventSource(`/api/chat/admin/stream?conversationId=${conversationId}&token=${token}`);
    events.onmessage = (event) => { const message = JSON.parse(event.data) as ChatMessage; if (message.id) setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]); };
    return () => events.close();
  }, [conversationId]);
  const send = async (event: FormEvent) => { event.preventDefault(); if (!conversationId || !text.trim()) return; const value = text.trim(); setText(""); await apiClient.post("/chat/admin/messages", { conversationId, text: value }, { headers: { Authorization: `Bearer ${readAdminSession() ?? ""}` } }); };
  return <section className="rounded-3xl border border-line bg-brand-foreground p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-heading text-2xl font-semibold text-brand">Онлайн-чат</h2><p className="mt-1 text-sm text-muted-ui-foreground">Сообщения посетителей появляются здесь в реальном времени.</p></div><span className="rounded-full bg-supporting/30 px-3 py-1 text-xs font-semibold text-supporting-foreground">Realtime</span></div><div className="grid gap-4 lg:grid-cols-[14rem_1fr]"><div className="rounded-2xl bg-page p-3 text-sm text-muted-ui-foreground">{[...new Set(messages.map((item) => item.conversationId))].map((id) => <button className={`block w-full rounded-xl px-3 py-3 text-left ${id === conversationId ? "bg-brand text-brand-foreground" : "hover:bg-panel"}`} key={id} onClick={() => setConversationId(id)} type="button">Диалог {id.slice(0, 8)}</button>)}</div><div className="flex min-h-80 flex-col rounded-2xl border border-line"><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.filter((item) => item.conversationId === conversationId).map((message) => <p className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${message.author === "manager" ? "ml-auto bg-brand text-brand-foreground" : "bg-page"}`} key={message.id}>{message.text}</p>)}{!conversationId && <p className="text-sm text-muted-ui-foreground">Пока нет активных диалогов.</p>}</div><form className="flex gap-2 border-t border-line p-3" onSubmit={send}><input className="min-w-0 flex-1 rounded-xl border border-line bg-page px-3 py-2 text-sm outline-none" disabled={!conversationId} onChange={(event) => setText(event.target.value)} placeholder="Ответ менеджера" value={text} /><button className="grid size-10 place-items-center rounded-xl bg-brand text-brand-foreground disabled:opacity-50" disabled={!conversationId} type="submit"><Send className="size-4" /></button></form></div></div></section>;
};
