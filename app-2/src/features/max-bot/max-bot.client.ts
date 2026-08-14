import type { Logger } from "pino";

const apiBaseUrl = "https://platform-api2.max.ru";

type MaxClientOptions = {
  readonly logger: Logger;
  readonly token?: string;
};

type MaxSendMessage = {
  readonly chatId: string;
  readonly text: string;
};

export const createMaxBotClient = ({ logger, token }: MaxClientOptions) => {
  const request = async (path: string, init: RequestInit) => {
    if (!token) throw new Error("MAX bot token is not configured");
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const body = (await response.text().catch(() => "")).slice(0, 500);
      logger.warn(
        { maxStatus: response.status, maxBody: body || undefined },
        "MAX Bot API request failed",
      );
      throw new Error(`MAX Bot API request failed with ${response.status}`);
    }
    return response;
  };

  return {
    configured: Boolean(token),
    sendMessage: async ({ chatId, text }: MaxSendMessage) => {
      await request("/messages", {
        method: "POST",
        body: JSON.stringify({ chat_id: chatId, text }),
      });
    },
  };
};

export type MaxBotClient = ReturnType<typeof createMaxBotClient>;
