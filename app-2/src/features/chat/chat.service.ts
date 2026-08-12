import type { Database } from "../../lib/database/database.js";

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
type ChatAuthor = ChatMessage["author"];

const subscribers = new Map<string, Set<Subscriber>>();

const toMessage = (message: {
  id: string;
  conversationId: string;
  author: string;
  text: string;
  bookingUrl: string | null;
  createdAt: Date;
}): ChatMessage => ({
  type: "message",
  id: message.id,
  conversationId: message.conversationId,
  author: message.author as ChatAuthor,
  text: message.text,
  createdAt: message.createdAt.toISOString(),
  ...(message.bookingUrl ? { bookingUrl: message.bookingUrl } : {}),
});

export const createChatService = (database: Database) => {
  const emit = (conversationId: string, event: ChatEvent) =>
    subscribers.get(conversationId)?.forEach((subscriber) => subscriber(event));

  const publish = async (
    conversationId: string,
    author: ChatAuthor,
    text: string,
    bookingUrl?: string,
  ) => {
    const message = await database.client.$transaction(async (transaction) => {
      const created = await transaction.chatMessage.create({
        data: { author, bookingUrl, conversationId, text },
      });
      await transaction.adminRequest.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      return created;
    });
    const event = toMessage(message);
    emit(conversationId, event);
    return event;
  };

  return {
    list: async (conversationId?: string) =>
      (
        await database.client.chatMessage.findMany({
          ...(conversationId ? { where: { conversationId } } : {}),
          orderBy: { createdAt: conversationId ? "asc" : "desc" },
          ...(conversationId ? {} : { take: 100 }),
        })
      ).map(toMessage),
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
