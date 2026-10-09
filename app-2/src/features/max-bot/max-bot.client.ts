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
type MaxPublishImage = {
  readonly content: Uint8Array;
  readonly contentType: string;
  readonly fileName: string;
};
type MaxSubscription = {
  readonly secret: string;
  readonly url: string;
};
type MaxBotIdentity = { readonly userId: string };

export class MaxApiError extends Error {
  readonly status: number;
  readonly providerCode?: string;

  constructor(status: number, providerCode?: string) {
    super(`MAX Bot API request failed with ${status}`);
    this.name = "MaxApiError";
    this.status = status;
    this.providerCode = providerCode;
  }
}

const shouldRetry = (status: number) => status === 429 || status >= 500;
const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const maxMessageLength = 4_000;
const maxChatId = (value: string) => {
  const chatId = value.trim();
  if (!/^-?\d+$/u.test(chatId)) throw new Error("MAX chat ID is invalid");
  return chatId;
};

export const createMaxBotClient = ({ logger, token }: MaxClientOptions) => {
  const normalizedToken = normalizeToken(token);
  let outgoing = Promise.resolve();
  let identityPromise: Promise<MaxBotIdentity | undefined> | undefined;
  const request = async (
    path: string,
    init: RequestInit,
    { retry = true }: { readonly retry?: boolean } = {},
  ) => {
    if (!normalizedToken) throw new Error("MAX bot token is not configured");
    let lastStatus = 0;
    const attempts = retry ? retryDelays.length : 0;
    for (let attempt = 0; attempt <= attempts; attempt += 1) {
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
        const payload = (await response
          .clone()
          .json()
          .catch(() => null)) as { code?: unknown } | null;
        const providerCode =
          typeof payload?.code === "string" ? payload.code : undefined;
        if (!retry || !shouldRetry(response.status) || attempt === attempts)
          throw new MaxApiError(response.status, providerCode);
      } catch (error) {
        if (error instanceof MaxApiError) throw error;
        if (attempt === attempts) {
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
  const readObject = async (response: Response) => {
    const value: unknown = await response.json();
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  };
  const uploadImage = async (image: MaxPublishImage) => {
    const uploadResponse = await request("/uploads?type=image", {
      method: "POST",
    });
    const upload = await readObject(uploadResponse);
    if (
      typeof upload.url !== "string" ||
      typeof upload.token !== "string" ||
      !upload.token.trim()
    )
      throw new Error("MAX did not return image-upload details");
    const uploadUrl = new URL(upload.url);
    if (uploadUrl.protocol !== "https:")
      throw new Error("MAX returned an insecure image-upload URL");

    const form = new FormData();
    const bytes = new ArrayBuffer(image.content.byteLength);
    new Uint8Array(bytes).set(image.content);
    form.append(
      "data",
      new Blob([bytes], { type: image.contentType }),
      image.fileName,
    );
    const fileResponse = await fetch(uploadUrl, {
      body: form,
      method: "POST",
      signal: AbortSignal.timeout(30_000),
    });
    if (!fileResponse.ok) throw new MaxApiError(fileResponse.status);
    return upload.token;
  };
  const enqueue = async <T>(operation: () => Promise<T>): Promise<T> => {
    const current = outgoing.then(operation, operation);
    outgoing = current.then(
      () => undefined,
      () => undefined,
    );
    return current;
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
    verifyChannelPublishing: async (chatId: string) => {
      const normalizedChatId = maxChatId(chatId);
      const chat = await readObject(
        await request(`/chats/${encodeURIComponent(normalizedChatId)}`, {
          method: "GET",
        }),
      );
      if (chat.type !== "channel" || chat.status !== "active")
        throw new MaxApiError(409, "channel_inactive_or_invalid");
      const member = await readObject(
        await request(
          `/chats/${encodeURIComponent(normalizedChatId)}/members/me`,
          { method: "GET" },
        ),
      );
      const permissions = Array.isArray(member.permissions)
        ? member.permissions
        : [];
      if (member.is_admin !== true || !permissions.includes("write"))
        throw new MaxApiError(403, "channel_write_permission_required");
      return { title: typeof chat.title === "string" ? chat.title : null };
    },
    registerWebhook: async ({ secret, url }: MaxSubscription) => {
      await request("/me", { method: "GET" });
      const response = await request("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          secret,
          update_types: ["message_created", "bot_added", "bot_removed"],
          url,
        }),
      });
      const result = await readObject(response);
      if (result.success !== true)
        throw new Error("MAX did not confirm the webhook subscription");
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
    publishChannelPost: async (input: {
      readonly chatId: string;
      readonly images: readonly MaxPublishImage[];
      readonly text: string;
    }) =>
      enqueue(async () => {
        const text = input.text.trim();
        if (!text || text.length > maxMessageLength)
          throw new Error(
            "MAX post text must contain at most 4,000 characters",
          );
        if (input.images.length > 12)
          throw new Error("MAX post has too many images");
        const tokens: string[] = [];
        for (const image of input.images) tokens.push(await uploadImage(image));
        if (tokens.length) await wait(1_000);
        const query = new URLSearchParams({
          chat_id: maxChatId(input.chatId),
        });
        let response: Response | undefined;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            response = await request(
              `/messages?${query.toString()}`,
              {
                method: "POST",
                body: JSON.stringify({
                  text,
                  ...(tokens.length
                    ? {
                        attachments: tokens.map((token) => ({
                          type: "image",
                          payload: { token },
                        })),
                      }
                    : {}),
                }),
              },
              { retry: false },
            );
            break;
          } catch (error) {
            if (
              !(error instanceof MaxApiError) ||
              error.providerCode !== "attachment.not.ready" ||
              attempt === 2
            )
              throw error;
            await wait(1_000 * (attempt + 1));
          }
        }
        if (!response) throw new Error("MAX did not confirm the post");
        const payload = await readObject(response);
        const message =
          payload.message && typeof payload.message === "object"
            ? (payload.message as Record<string, unknown>)
            : payload;
        const id = message.message_id ?? message.id;
        return {
          externalId:
            typeof id === "string" || typeof id === "number"
              ? String(id)
              : null,
          url: typeof message.url === "string" ? message.url : null,
        };
      }),
  };
};

export type MaxBotClient = ReturnType<typeof createMaxBotClient>;
