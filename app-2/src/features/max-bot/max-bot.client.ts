import type { Logger } from "pino";

const apiBaseUrl = "https://platform-api2.max.ru";
const normalizeToken = (token: string | undefined) => {
  const trimmed = token?.trim() ?? "";
  const withoutScheme = trimmed.replace(/^Bearer\s+/iu, "");
  return withoutScheme.replace(/^(?:"(.*)"|'(.*)')$/su, "$1$2");
};
const retryDelays = [250, 750] as const;

type MaxClientOptions = {
  readonly logger: Logger;
  readonly token?: string;
};

type MaxSendMessage = {
  readonly chatId: string;
  readonly text: string;
};
type MaxSubscription = {
  readonly secret: string;
  readonly url: string;
};
type MaxBotIdentity = { readonly userId: string };

export class MaxApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`MAX Bot API request failed with ${status}`);
    this.name = "MaxApiError";
    this.status = status;
  }
}

const shouldRetry = (status: number) => status === 429 || status >= 500;
const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const maxMessageLength = 4_000;
const maxChatId = (value: string) => {
  const chatId = value.trim();
  if (!/^\d+$/u.test(chatId)) throw new Error("MAX chat ID is invalid");
  return chatId;
};

export const createMaxBotClient = ({ logger, token }: MaxClientOptions) => {
  const normalizedToken = normalizeToken(token);
  let outgoing = Promise.resolve();
  let identityPromise: Promise<MaxBotIdentity | undefined> | undefined;
  const request = async (path: string, init: RequestInit) => {
    if (!normalizedToken) throw new Error("MAX bot token is not configured");
    let lastStatus = 0;
    for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
      try {
        const response = await fetch(`${apiBaseUrl}${path}`, {
          ...init,
          headers: {
            Authorization: normalizedToken,
            "Content-Type": "application/json",
            ...(init.headers ?? {}),
          },
          signal: AbortSignal.timeout(15_000),
        });
        if (response.ok) return response;
        lastStatus = response.status;
        if (!shouldRetry(response.status) || attempt === retryDelays.length)
          break;
      } catch (error) {
        if (attempt === retryDelays.length) {
          logger.warn(
            { error: error instanceof Error ? error.message : "Unknown error" },
            "MAX Bot API request failed",
          );
          throw error;
        }
      }
      await wait(retryDelays[attempt]!);
    }
    logger.warn({ maxStatus: lastStatus }, "MAX Bot API request failed");
    throw new MaxApiError(lastStatus);
  };
  const enqueue = async (operation: () => Promise<void>) => {
    const current = outgoing.then(operation, operation);
    outgoing = current.catch(() => undefined);
    await current;
  };

  return {
    MaxApiError,
    configured: Boolean(normalizedToken),
    getBotIdentity: async (): Promise<MaxBotIdentity | undefined> => {
      if (!normalizedToken) return undefined;
      identityPromise ??= request("/me", { method: "GET" }).then(
        async (response) => {
          const payload: unknown = await response.json();
          const data =
            payload && typeof payload === "object"
              ? (payload as Record<string, unknown>)
              : {};
          const user =
            data.user && typeof data.user === "object"
              ? (data.user as Record<string, unknown>)
              : data;
          const value = user.user_id ?? user.id;
          return typeof value === "string" || typeof value === "number"
            ? { userId: String(value) }
            : undefined;
        },
      );
      return identityPromise;
    },
    verifyCredentials: async () => {
      await request("/me", { method: "GET" });
    },
    registerWebhook: async ({ secret, url }: MaxSubscription) => {
      await request("/me", { method: "GET" });
      await request("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          secret,
          update_types: ["message_created"],
          url,
        }),
      });
    },
    sendMessage: async ({ chatId, text }: MaxSendMessage) =>
      enqueue(async () => {
        const normalizedText = text.trim();
        if (!normalizedText || normalizedText.length > maxMessageLength)
          throw new Error("MAX message text is invalid");
        const search = new URLSearchParams({ chat_id: maxChatId(chatId) });
        await request(`/messages?${search.toString()}`, {
          method: "POST",
          // MAX accepts the destination exclusively as a query parameter.
          body: JSON.stringify({ text: normalizedText }),
        });
      }),
  };
};

export type MaxBotClient = ReturnType<typeof createMaxBotClient>;
