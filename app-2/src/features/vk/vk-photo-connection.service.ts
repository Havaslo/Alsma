import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { photoAuthDiagnostic } from "./vk-photo-auth-diagnostic.js";
import { VkApiError, createVkClient } from "./vk.client.js";

export type VkPhotoOAuthConfiguration = {
  readonly appId?: string;
  readonly appSecret?: string;
  readonly redirectUri?: string;
  readonly encryptionKey?: string;
};

const savedSchema = z.object({
  ciphertext: z.string(),
  expiresAt: z.number().nullable(),
  connectedAt: z.string(),
});
const stateSchema = z.object({
  origin: z.string().url(),
  redirectUri: z.string().url(),
  groupId: z.string(),
  expiresAt: z.number(),
});
const keyBytes = (key: string) => {
  const bytes = Buffer.from(key, "base64");
  if (bytes.length !== 32)
    throw new Error("VK photo encryption key must contain 32 bytes");
  return bytes;
};
const seal = (token: string, key: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(key), iv);
  cipher.setAAD(Buffer.from("alsma-vk-photo-v1"));
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
};
const unseal = (value: string, key: string) => {
  const [iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Invalid VK photo connection");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    keyBytes(key),
    Buffer.from(iv, "base64url"),
  );
  cipher.setAAD(Buffer.from("alsma-vk-photo-v1"));
  cipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    cipher.update(Buffer.from(encrypted, "base64url")),
    cipher.final(),
  ]).toString("utf8");
};

export const createVkPhotoConnectionService = (options: {
  readonly database: Database;
  readonly configuration: VkPhotoOAuthConfiguration;
  readonly allowedOrigins: readonly string[];
  readonly groupId?: string;
  readonly communityToken?: string;
  readonly fallbackPhotoToken?: string;
  readonly logger: Logger;
}) => {
  const config = options.configuration;
  const connectionKey = `vk.photo.connection.${options.groupId ?? "unconfigured"}`;
  const statePrefix = "vk.photo.oauth.state.";
  const configured = Boolean(
    config.appId &&
    config.appSecret &&
    config.redirectUri &&
    config.encryptionKey &&
    options.groupId &&
    options.communityToken,
  );
  const fallbackOrigin =
    options.allowedOrigins.find(
      (origin) => new URL(origin).hostname === "alsma.ru",
    ) ?? options.allowedOrigins[0];
  const read = async () => {
    const row = await options.database.client.appSetting.findUnique({
      where: { key: connectionKey },
    });
    if (!row) return null;
    const parsed = savedSchema.safeParse(row.value);
    if (!parsed.success) throw new Error("Invalid VK photo connection");
    return parsed.data;
  };
  const getToken = async () => {
    const saved = await read();
    if (!saved) return options.fallbackPhotoToken;
    if (saved.expiresAt !== null && saved.expiresAt <= Date.now())
      throw new VkApiError(5, "VK photo upload access token has expired");
    if (!config.encryptionKey)
      throw new Error("VK photo encryption is not configured");
    return unseal(saved.ciphertext, config.encryptionKey);
  };
  const verify = async (token: string) =>
    createVkClient({
      accessToken: options.communityToken,
      photoUploadAccessToken: token,
      logger: options.logger,
      singleAttempt: true,
    }).verifyWallPhotoUpload(options.groupId!);

  const status = async () => {
    const saved = await read();
    const expired =
      saved?.expiresAt !== null &&
      saved?.expiresAt !== undefined &&
      saved.expiresAt <= Date.now();
    let photoReady = false;
    let reason: string | null = expired ? "EXPIRED" : null;
    try {
      const token = await getToken();
      if (token && options.groupId && options.communityToken) {
        await verify(token);
        photoReady = true;
      } else reason = "PHOTO_TOKEN_MISSING";
    } catch (error) {
      reason = photoAuthDiagnostic(error);
      if (reason === "UNKNOWN" && error instanceof VkApiError)
        reason = "PHOTO_ACCESS_DENIED";
    }
    return {
      configured,
      photoReady,
      reason,
      connectedAt: saved?.connectedAt ?? null,
      expiresAt: saved?.expiresAt
        ? new Date(saved.expiresAt).toISOString()
        : null,
    };
  };

  const start = async (origin: string | undefined) => {
    if (!configured)
      throw new HttpError(
        409,
        "VK_PHOTO_OAUTH_NOT_CONFIGURED",
        "Сначала настройте серверное подключение приложения VK.",
      );
    if (!origin || !options.allowedOrigins.includes(origin))
      throw new HttpError(
        403,
        "VK_PHOTO_ORIGIN_DENIED",
        "Недопустимый адрес страницы подключения VK.",
      );
    const state = randomBytes(32).toString("base64url");
    const key = statePrefix + createHash("sha256").update(state).digest("hex");
    await options.database.client.appSetting.deleteMany({
      where: {
        key: { startsWith: statePrefix },
        updatedAt: { lt: new Date(Date.now() - 10 * 60_000) },
      },
    });
    await options.database.client.appSetting.create({
      data: {
        key,
        value: {
          origin,
          groupId: options.groupId!,
          redirectUri: config.redirectUri!,
          expiresAt: Date.now() + 10 * 60_000,
        },
      },
    });
    const url = new URL("https://oauth.vk.com/authorize");
    url.search = new URLSearchParams({
      client_id: config.appId!,
      redirect_uri: config.redirectUri!,
      response_type: "code",
      scope: "photos",
      state,
      display: "page",
      v: "5.199",
    }).toString();
    return { authorizationUrl: url.toString() };
  };

  const complete = async (input: {
    state?: string;
    code?: string;
    error?: string;
  }) => {
    const fallback = { origin: fallbackOrigin, result: "INVALID_STATE" };
    if (!input.state || input.state.length > 256) return fallback;
    const key =
      statePrefix + createHash("sha256").update(input.state).digest("hex");
    const row = await options.database.client.appSetting.findUnique({
      where: { key },
    });
    if (!row) return fallback;
    // Claim once across replicas before making any provider request.
    const claimed = await options.database.client.appSetting.deleteMany({
      where: { key, updatedAt: row.updatedAt },
    });
    const state = stateSchema.safeParse(row.value);
    if (
      claimed.count !== 1 ||
      !state.success ||
      state.data.expiresAt <= Date.now() ||
      !options.allowedOrigins.includes(state.data.origin) ||
      state.data.groupId !== options.groupId ||
      state.data.redirectUri !== config.redirectUri
    )
      return fallback;
    const origin = state.data.origin;
    if (input.error) return { origin, result: "AUTHORIZATION_DENIED" };
    if (!input.code || !configured) return { origin, result: "NOT_CONFIGURED" };
    try {
      // The token is issued to the backend, never copied from a browser IP.
      // photos only: wall.post continues to use the separate community token.
      const response = await fetch("https://oauth.vk.com/access_token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: config.appId!,
          client_secret: config.appSecret!,
          redirect_uri: state.data.redirectUri,
          code: input.code,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
      const data = z
        .object({
          access_token: z.string().min(20),
          expires_in: z.number().int().nonnegative(),
        })
        .safeParse(await response.json().catch(() => null));
      if (!response.ok || !data.success)
        return { origin, result: "CODE_EXCHANGE_DENIED" };
      await verify(data.data.access_token);
      const value = {
        ciphertext: seal(data.data.access_token, config.encryptionKey!),
        expiresAt:
          data.data.expires_in > 0
            ? Date.now() + data.data.expires_in * 1000
            : null,
        connectedAt: new Date().toISOString(),
      };
      await options.database.client.appSetting.upsert({
        where: { key: connectionKey },
        create: { key: connectionKey, value },
        update: { value },
      });
      return { origin, result: "CONNECTED" };
    } catch (error) {
      const reason = photoAuthDiagnostic(error);
      options.logger.warn(
        { reason, vkCode: error instanceof VkApiError ? error.code : null },
        "VK server photo connection failed",
      );
      return {
        origin,
        result: reason === "UNKNOWN" ? "PHOTO_ACCESS_DENIED" : reason,
      };
    }
  };
  return { start, complete, status, getToken };
};
export type VkPhotoConnectionService = ReturnType<
  typeof createVkPhotoConnectionService
>;
