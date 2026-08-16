import type { Logger } from "pino";

const apiBaseUrl = "https://api.vk.com/method";
const apiVersion = "5.199";
const retryDelays = [250, 750] as const;
const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class VkApiError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = "VkApiError";
    this.code = code;
  }
}
const shouldRetry = (code: number) => code === 6 || code === 10 || code === 29;
const randomIdFor = (value: string) => {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return String(((hash >>> 0) % 2_147_483_646) + 1);
};
export type VkHistoryMessage = {
  readonly id: string;
  readonly fromId: string;
  readonly peerId: string;
  readonly text: string;
  readonly date: number;
};

export const createVkClient = ({
  accessToken,
  logger,
}: {
  readonly accessToken?: string;
  readonly logger: Logger;
}) => {
  const token = accessToken?.trim();
  const request = async (
    method: string,
    parameters: Record<string, string>,
  ) => {
    if (!token) throw new Error("VK access token is not configured");
    for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
      const query = new URLSearchParams({
        ...parameters,
        access_token: token,
        v: apiVersion,
      });
      try {
        const response = await fetch(`${apiBaseUrl}/${method}?${query}`, {
          signal: AbortSignal.timeout(15_000),
        });
        const payload = (await response.json().catch(() => null)) as {
          response?: unknown;
          error?: { error_code?: number; error_msg?: string };
        } | null;
        if (response.ok && payload?.response !== undefined)
          return payload.response;
        const error = new VkApiError(
          payload?.error?.error_code ?? response.status,
          payload?.error?.error_msg ?? "VK API request failed",
        );
        if (!shouldRetry(error.code) || attempt === retryDelays.length)
          throw error;
      } catch (error) {
        if (error instanceof VkApiError) throw error;
        if (attempt === retryDelays.length) throw error;
      }
      await wait(retryDelays[attempt]!);
    }
    throw new Error("VK API request failed");
  };
  return {
    configured: Boolean(token),
    verifyCredentials: async (groupId: string) => {
      await request("groups.getById", { group_id: groupId });
    },
    getHistory: async (peerId: string): Promise<VkHistoryMessage[]> => {
      const history: VkHistoryMessage[] = [];
      for (let offset = 0; offset < 2_000; offset += 200) {
        const result = (await request("messages.getHistory", {
          peer_id: peerId,
          count: "200",
          offset: String(offset),
        })) as { items?: Array<Record<string, unknown>> };
        const page = (result.items ?? [])
          .map((item) => ({
            id: String(item.id ?? ""),
            fromId: String(item.from_id ?? ""),
            peerId: String(item.peer_id ?? peerId),
            text: typeof item.text === "string" ? item.text.trim() : "",
            date: Number(item.date ?? 0),
          }))
          .filter((item) => item.id && item.text && item.date);
        history.push(...page);
        if (page.length < 200) break;
      }
      return history.sort((left, right) => left.date - right.date);
    },
    sendMessage: async (userId: string, text: string, randomId: string) => {
      await request("messages.send", {
        peer_id: userId,
        random_id: randomIdFor(randomId),
        message: text.slice(0, 4_096),
      });
    },
    logConfigurationError: () => logger.warn("VK API client is not configured"),
  };
};
export type VkClient = ReturnType<typeof createVkClient>;
