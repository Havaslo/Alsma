import { randomUUID } from "node:crypto";

export type ChatMessage = {
  readonly type: "message";
  readonly id: string;
  readonly conversationId: string;
  readonly author: "guest" | "agent" | "manager";
  readonly text: string;
  readonly createdAt: string;
  readonly bookingUrl?: string;
};

export type ChatStatus = {
  readonly type: "status";
  readonly conversationId: string;
  readonly status: "thinking" | "checking_availability" | "composing" | "idle";
  readonly label: string;
};

export type ChatEvent = ChatMessage | ChatStatus;
type Subscriber = (event: ChatEvent) => void;

const messages = new Map<string, ChatMessage[]>();
const subscribers = new Map<string, Set<Subscriber>>();

export const createChatService = () => {
  const emit = (conversationId: string, event: ChatEvent) =>
    subscribers.get(conversationId)?.forEach((subscriber) => subscriber(event));

  const publish = (
    conversationId: string,
    author: ChatMessage["author"],
    text: string,
    bookingUrl?: string,
  ) => {
    const message: ChatMessage = {
      type: "message",
      id: randomUUID(),
      conversationId,
      author,
      text,
      createdAt: new Date().toISOString(),
      ...(bookingUrl ? { bookingUrl } : {}),
    };
    const conversation = messages.get(conversationId) ?? [];
    conversation.push(message);
    messages.set(conversationId, conversation.slice(-100));
    emit(conversationId, message);
    return message;
  };

  return {
    list: (conversationId?: string) => {
      if (conversationId) return messages.get(conversationId) ?? [];
      return [...messages.values()]
        .flat()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    publish,
    publishStatus: (
      conversationId: string,
      status: ChatStatus["status"],
      label: string,
    ) =>
      emit(conversationId, { type: "status", conversationId, status, label }),
    subscribe: (conversationId: string, subscriber: Subscriber) => {
      const set = subscribers.get(conversationId) ?? new Set<Subscriber>();
      set.add(subscriber);
      subscribers.set(conversationId, set);
      return () => {
        set.delete(subscriber);
        if (!set.size) subscribers.delete(conversationId);
      };
    },
  };
};

export type ChatService = ReturnType<typeof createChatService>;
