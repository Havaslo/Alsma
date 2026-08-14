import type { Logger } from "pino";

const apiBaseUrl = "https://platform-api2.max.ru";
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

const shouldRetry = (status: number) => status === 429 || status >= 500;
const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const createMaxBotClient = ({ logger, token }: MaxClientOptions) => {
  let outgoing = Promise.resolve();
  const request = async (path: string, init: RequestInit) => {
    if (!token) throw new Error("MAX bot token is not configured");
    let lastStatus = 0;
    for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
      try {
        const response = await fetch(`${apiBaseUrl}${path}`, {
          ...init,
          headers: {
            Authorization: token,
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
    throw new Error(`MAX Bot API request failed with ${lastStatus}`);
  };
  const enqueue = async (operation: () => Promise<void>) => {
    const current = outgoing.then(operation, operation);
    outgoing = current.catch(() => undefined);
    await current;
  };

  return {
    configured: Boolean(token),
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
        await request("/messages", {
          method: "POST",
          body: JSON.stringify({ chat_id: chatId, text }),
        });
      }),
  };
};

export type MaxBotClient = ReturnType<typeof createMaxBotClient>;
