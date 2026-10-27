import type { Logger } from "pino";

const apiBaseUrl = "https://api.telegram.org";
const maxPostLength = 4_096;
const maxCaptionLength = 1_024;
const maxImages = 10;

type PublishImage = {
  readonly content: Uint8Array;
  readonly contentType: string;
  readonly fileName: string;
};

type TelegramApiResponse<T> = {
  readonly ok?: boolean;
  readonly result?: T;
  readonly error_code?: number;
};

type TelegramChat = {
  readonly type?: string;
  readonly permissions?: { readonly can_send_messages?: boolean };
};

type TelegramMember = {
  readonly status?: string;
  readonly is_member?: boolean;
  readonly can_send_messages?: boolean;
  readonly can_post_messages?: boolean;
};

type TelegramMessage = { readonly message_id?: number };

export class TelegramApiError extends Error {
  readonly status: number;
  readonly partialPublication: boolean;

  constructor(status: number, partialPublication = false) {
    super(`Telegram Bot API request failed with ${status}`);
    this.name = "TelegramApiError";
    this.status = status;
    this.partialPublication = partialPublication;
  }
}

const normalizeChatId = (value: string) => {
  const chatId = value.trim();
  if (
    chatId.length > 200 ||
    (!/^-?\d+$/u.test(chatId) && !/^@[A-Za-z0-9_]{5,32}$/u.test(chatId))
  )
    throw new Error("Telegram target must be a numeric chat ID or @username");
  return chatId;
};

const asBlob = (image: PublishImage) => {
  const bytes = new ArrayBuffer(image.content.byteLength);
  new Uint8Array(bytes).set(image.content);
  return new Blob([bytes], { type: image.contentType });
};

const messageId = (message: TelegramMessage) =>
  typeof message.message_id === "number" ? String(message.message_id) : null;

export const createTelegramBotClient = (options: {
  readonly logger: Logger;
  readonly fetch?: typeof fetch;
  readonly proxyKey?: string;
  readonly proxyUrl?: string;
  readonly token?: string;
}) => {
  const token = options.token?.trim();
  const fetcher = options.fetch ?? fetch;

  const request = async <T>(method: string, body: unknown): Promise<T> => {
    if (!token) throw new Error("Telegram bot token is not configured");
    const isMultipart = body instanceof FormData;
    let response: Response;
    try {
      const url = `${apiBaseUrl}/bot${token}/${method}`;
      if (options.proxyUrl && options.proxyKey) {
        const multipartRequest = isMultipart
          ? new Request(url, { body: body as FormData, method: "POST" })
          : undefined;
        const contentType =
          multipartRequest?.headers.get("content-type") ?? "application/json";
        const proxyBody = multipartRequest
          ? Buffer.from(await multipartRequest.arrayBuffer()).toString("base64")
          : JSON.stringify(body);
        response = await fetcher(options.proxyUrl, {
          body: JSON.stringify({
            url,
            method: "POST",
            headers: { "Content-Type": contentType },
            body: proxyBody,
            ...(multipartRequest ? { bodyEncoding: "base64" } : {}),
          }),
          headers: {
            Authorization: `Bearer ${options.proxyKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: AbortSignal.timeout(isMultipart ? 60_000 : 20_000),
        });
      } else {
        response = await fetcher(url, {
          body: isMultipart ? body : JSON.stringify(body),
          headers: isMultipart
            ? undefined
            : { "Content-Type": "application/json" },
          method: "POST",
          signal: AbortSignal.timeout(isMultipart ? 30_000 : 15_000),
        });
      }
    } catch (error) {
      options.logger.warn(
        { errorName: error instanceof Error ? error.name : "UnknownError" },
        "Telegram Bot API request failed",
      );
      throw error;
    }

    const payload = (await response
      .json()
      .catch(() => null)) as TelegramApiResponse<T> | null;
    if (!response.ok || payload?.ok !== true)
      throw new TelegramApiError(
        typeof payload?.error_code === "number"
          ? payload.error_code
          : response.status,
      );
    return payload.result as T;
  };

  const sendText = (chatId: string, text: string) =>
    request<TelegramMessage>("sendMessage", { chat_id: chatId, text });

  const publishMedia = async (
    chatId: string,
    images: readonly PublishImage[],
    text: string,
  ) => {
    const caption = text.length <= maxCaptionLength ? text : "";
    let sent: readonly TelegramMessage[];
    if (images.length === 1) {
      const form = new FormData();
      form.set("chat_id", chatId);
      form.set("photo", asBlob(images[0]!), images[0]!.fileName);
      if (caption) form.set("caption", caption);
      sent = [await request<TelegramMessage>("sendPhoto", form)];
    } else {
      const form = new FormData();
      form.set("chat_id", chatId);
      form.set(
        "media",
        JSON.stringify(
          images.map((image, index) => ({
            type: "photo",
            media: `attach://photo${index}`,
            ...(index === 0 && caption ? { caption } : {}),
          })),
        ),
      );
      images.forEach((image, index) => {
        form.set(`photo${index}`, asBlob(image), image.fileName);
      });
      sent = await request<readonly TelegramMessage[]>("sendMediaGroup", form);
    }

    if (!caption) {
      try {
        const textMessage = await sendText(chatId, text);
        return {
          externalId:
            [
              ...sent.map(messageId).filter((id): id is string => id !== null),
              messageId(textMessage),
            ]
              .filter(Boolean)
              .join(",") || null,
          url: null,
        };
      } catch (error) {
        if (error instanceof TelegramApiError)
          throw new TelegramApiError(error.status, true);
        throw error;
      }
    }

    return {
      externalId:
        sent
          .map(messageId)
          .filter((id): id is string => id !== null)
          .join(",") || null,
      url: null,
    };
  };

  return {
    configured: Boolean(token),
    verifyChannelPublishing: async (target: string) => {
      const chatId = normalizeChatId(target);
      const [chat, identity] = await Promise.all([
        request<TelegramChat>("getChat", { chat_id: chatId }),
        request<{ readonly id?: number }>("getMe", {}),
      ]);
      if (
        !identity.id ||
        !["channel", "group", "supergroup"].includes(chat.type ?? "")
      )
        throw new TelegramApiError(409);
      const member = await request<TelegramMember>("getChatMember", {
        chat_id: chatId,
        user_id: identity.id,
      });
      if (chat.type === "channel") {
        if (
          !["creator", "administrator"].includes(member.status ?? "") ||
          (member.status === "administrator" &&
            member.can_post_messages !== true)
        )
          throw new TelegramApiError(403);
        return;
      }
      if (
        member.status === "left" ||
        member.status === "kicked" ||
        (member.status === "restricted" &&
          (member.is_member !== true || member.can_send_messages !== true)) ||
        chat.permissions?.can_send_messages === false
      )
        throw new TelegramApiError(403);
    },
    publishChannelPost: async (input: {
      readonly chatId: string;
      readonly images: readonly PublishImage[];
      readonly text: string;
    }) => {
      const chatId = normalizeChatId(input.chatId);
      const text = input.text.trim();
      if (!text || text.length > maxPostLength)
        throw new Error("Telegram post text must contain 1–4,096 characters");
      if (input.images.length > maxImages)
        throw new Error("Telegram posts support at most ten images");
      if (input.images.length) return publishMedia(chatId, input.images, text);
      const sent = await sendText(chatId, text);
      return { externalId: messageId(sent), url: null };
    },
  };
};

export type TelegramBotClient = ReturnType<typeof createTelegramBotClient>;
