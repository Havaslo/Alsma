import { randomUUID } from "node:crypto";

export type ChatMessage = {
  readonly id: string;
  readonly conversationId: string;
  readonly author: "guest" | "manager";
  readonly text: string;
  readonly createdAt: string;
};

type Subscriber = (message: ChatMessage) => void;

const messages = new Map<string, ChatMessage[]>();
const subscribers = new Map<string, Set<Subscriber>>();

export const createChatService = () => {
  const publish = (
    conversationId: string,
    author: ChatMessage["author"],
    text: string,
  ) => {
    const message: ChatMessage = {
      id: randomUUID(),
      conversationId,
      author,
      text,
      createdAt: new Date().toISOString(),
    };
    const conversation = messages.get(conversationId) ?? [];
    conversation.push(message);
    messages.set(conversationId, conversation.slice(-100));
    subscribers
      .get(conversationId)
      ?.forEach((subscriber) => subscriber(message));
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
