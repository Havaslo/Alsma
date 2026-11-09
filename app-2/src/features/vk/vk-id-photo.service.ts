import { createHash, randomBytes } from "node:crypto";
import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { oauthEvidence, oauthEvidenceSchema } from "./vk-oauth-evidence.js";
import { seal, unseal } from "./vk-photo-crypto.js";
import { createVkClient } from "./vk.client.js";

const credentialsSchema = z.object({
  accessToken: z.string().min(20),
  refreshToken: z.string().min(20),
  deviceId: z.string().min(1),
  appId: z.string(),
  redirectUri: z.string().url(),
  userId: z.string(),
});
const recordSchema = z.object({
  ciphertext: z.string(),
  expiresAt: z.number(),
  connectedAt: z.string(),
  lastRefreshAt: z.string(),
});
const stateSchema = z.object({
  origin: z.string().url(),
  groupId: z.string(),
  appId: z.string(),
  redirectUri: z.string().url(),
  adminId: z.string(),
  verifier: z.string(),
  expiresAt: z.number(),
});
const responseSchema = z.object({
  access_token: z.string().min(20),
  refresh_token: z.string().min(20),
  expires_in: z.number().int().positive(),
  state: z.string(),
  scope: z.string(),
  user_id: z.union([z.number(), z.string()]).optional(),
});
const nonce = () => randomBytes(32).toString("base64url");

// Separate from legacy OAuth: a failed experiment never replaces working access.
export const createVkIdPhotoService = (options: {
  database: Database;
  appId?: string;
  redirectUri?: string;
  encryptionKey?: string;
  allowedOrigins: readonly string[];
  groupId?: string;
  communityToken?: string;
  logger: Logger;
}) => {
  const { database, appId, redirectUri, encryptionKey } = options;
  const configured = Boolean(
    appId &&
    redirectUri &&
    encryptionKey &&
    options.groupId &&
    options.communityToken,
  );
  const key = `vk.photo.vkid.${options.groupId ?? "unconfigured"}`;
  const attemptKey = `${key}.lastAttempt`;
  const evidenceKey = `${key}.lastExchange`;
  const recordAttempt = async (result: string, stage: string) => {
    const value = {
      appId: appId ?? null,
      result,
      stage,
      at: new Date().toISOString(),
    };
    await database.client.appSetting.upsert({
      where: { key: attemptKey },
      create: { key: attemptKey, value },
      update: { value },
    });
  };
  const prefix = "vk.photo.vkid.state.";
  const fallback =
    options.allowedOrigins.find((x) => new URL(x).hostname === "alsma.ru") ??
    options.allowedOrigins[0];
  const verify = (token: string) =>
    createVkClient({
      accessToken: options.communityToken,
      photoUploadAccessToken: token,
      logger: options.logger,
      singleAttempt: true,
    }).verifyWallPhotoUpload(options.groupId!);
  const exchange = async (parameters: Record<string, string>) => {
    const state = parameters.state;
    const response = await fetch("https://id.vk.ru/oauth2/auth", {
      method: "POST",
      body: new URLSearchParams(parameters),
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    const payload: unknown = await response.json().catch(() => null);
    const value = oauthEvidence(
      payload,
      response.status,
      parameters.grant_type === "refresh_token"
        ? "refresh_token"
        : "authorization_code",
    );
    await database.client.appSetting.upsert({
      where: { key: evidenceKey },
      create: { key: evidenceKey, value },
      update: { value },
    });
    const parsed = responseSchema.safeParse(payload);
    if (!response.ok || !parsed.success || parsed.data.state !== state)
      throw new Error("VKID_EXCHANGE_DENIED");
    if (!parsed.data.scope.split(/[ ,]+/).includes("photos"))
      throw new Error("VKID_PHOTOS_NOT_GRANTED");
    return parsed.data;
  };
  const status = async () => {
    const row = await database.client.appSetting.findUnique({ where: { key } });
    const saved = row ? recordSchema.parse(row.value) : null;
    const attempt = await database.client.appSetting.findUnique({
      where: { key: attemptKey },
    });
    const evidence = await database.client.appSetting.findUnique({
      where: { key: evidenceKey },
    });
    const lastExchange = oauthEvidenceSchema.safeParse(evidence?.value);
    const lastAttempt = z
      .object({
        appId: z.string().nullable(),
        result: z.string(),
        stage: z.string(),
        at: z.string(),
      })
      .safeParse(attempt?.value);
    return {
      configured,
      lastExchange: lastExchange.success ? lastExchange.data : null,
      lastAttempt: lastAttempt.success ? lastAttempt.data : null,
      connected: Boolean(saved),
      autoRenewal: Boolean(saved),
      connectedAt: saved?.connectedAt ?? null,
      expiresAt: saved ? new Date(saved.expiresAt).toISOString() : null,
      lastRefreshAt: saved?.lastRefreshAt ?? null,
    };
  };
  const start = async (origin: string | undefined, adminId: string) => {
    if (!configured)
      throw new HttpError(
        409,
        "VKID_NOT_CONFIGURED",
        "Укажите приложение VK ID и адрес возврата для подключения с автообновлением.",
      );
    if (!adminId || !origin || !options.allowedOrigins.includes(origin))
      throw new HttpError(
        403,
        "VKID_ORIGIN_DENIED",
        "Недопустимый запрос подключения VK ID.",
      );
    const state = nonce(),
      verifier = nonce();
    await database.client.appSetting.deleteMany({
      where: {
        key: { startsWith: prefix },
        updatedAt: { lt: new Date(Date.now() - 600000) },
      },
    });
    await database.client.appSetting.create({
      data: {
        key: prefix + createHash("sha256").update(state).digest("hex"),
        value: {
          ciphertext: seal(
            JSON.stringify({
              origin,
              groupId: options.groupId,
              appId,
              redirectUri,
              adminId,
              verifier,
              expiresAt: Date.now() + 600000,
            }),
            encryptionKey!,
          ),
        },
      },
    });
    const url = new URL("https://id.vk.ru/authorize");
    url.search = new URLSearchParams({
      client_id: appId!,
      redirect_uri: redirectUri!,
      response_type: "code",
      scope: "photos",
      state,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "s256",
    }).toString();
    await recordAttempt("AWAITING_CALLBACK", "authorization");
    return { authorizationUrl: url.toString() };
  };
  const complete = async (input: {
    state?: string;
    code?: string;
    device_id?: string;
    error?: string;
  }) => {
    const invalid = { origin: fallback, result: "INVALID_STATE" };
    if (!configured || !input.state || input.state.length > 256) return invalid;
    const stateKey =
      prefix + createHash("sha256").update(input.state).digest("hex");
    const row = await database.client.appSetting.findUnique({
      where: { key: stateKey },
    });
    if (!row) return invalid;
    let state: z.infer<typeof stateSchema>;
    try {
      const value = z.object({ ciphertext: z.string() }).parse(row.value);
      state = stateSchema.parse(
        JSON.parse(unseal(value.ciphertext, encryptionKey!)),
      );
    } catch {
      return invalid;
    }
    if (
      state.expiresAt <= Date.now() ||
      state.groupId !== options.groupId ||
      state.appId !== appId ||
      state.redirectUri !== redirectUri ||
      !options.allowedOrigins.includes(state.origin)
    )
      return invalid;
    const claimed = await database.client.appSetting.deleteMany({
      where: { key: stateKey, updatedAt: row.updatedAt },
    });
    if (claimed.count !== 1) return invalid;
    const origin = state.origin;
    if (input.error) {
      await recordAttempt("AUTHORIZATION_DENIED", "callback");
      return { origin, result: "AUTHORIZATION_DENIED" };
    }
    if (!input.code || !input.device_id) {
      await recordAttempt("VKID_CODE_MISSING", "callback");
      return { origin, result: "VKID_CODE_MISSING" };
    }
    let stage = "code_exchange";
    try {
      const issued = await exchange({
        grant_type: "authorization_code",
        client_id: appId!,
        redirect_uri: redirectUri!,
        code: input.code,
        device_id: input.device_id,
        code_verifier: state.verifier,
        state: input.state,
      });
      stage = "photo_access";
      await verify(issued.access_token);
      // Exercise actual refresh before activation, not just presence of a token.
      stage = "refresh";
      const rotated = await exchange({
        grant_type: "refresh_token",
        client_id: appId!,
        redirect_uri: redirectUri!,
        refresh_token: issued.refresh_token,
        device_id: input.device_id,
        state: nonce(),
      });
      if (
        issued.user_id != null &&
        rotated.user_id != null &&
        String(issued.user_id) !== String(rotated.user_id)
      )
        throw new Error("VKID_USER_MISMATCH");
      stage = "refreshed_photo_access";
      await verify(rotated.access_token);
      const credentials = {
        accessToken: rotated.access_token,
        refreshToken: rotated.refresh_token,
        deviceId: input.device_id,
        appId: appId!,
        redirectUri: redirectUri!,
        userId: String(rotated.user_id ?? issued.user_id ?? ""),
      };
      const now = new Date().toISOString();
      const value = {
        ciphertext: seal(JSON.stringify(credentials), encryptionKey!),
        expiresAt: Date.now() + rotated.expires_in * 1000,
        connectedAt: now,
        lastRefreshAt: now,
      };
      stage = "save";
      await database.client.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
        await tx.appSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      });
      await recordAttempt("VKID_CONNECTED", "complete");
      return { origin, result: "VKID_CONNECTED" };
    } catch (error) {
      const result =
        error instanceof Error && error.message === "VKID_PHOTOS_NOT_GRANTED"
          ? "VKID_PHOTOS_NOT_GRANTED"
          : "VKID_CONNECTION_DENIED";
      await recordAttempt(result, stage);
      options.logger.warn(
        { reason: result, stage },
        "VK ID photo connection was not activated",
      );
      return { origin, result };
    }
  };
  const getToken = async (): Promise<string | null> => {
    // No new configuration means no change to existing legacy installations.
    if (!configured) return null;
    const row = await database.client.appSetting.findUnique({ where: { key } });
    if (!row) return null;
    const saved = recordSchema.parse(row.value);
    const decode = (ciphertext: string) => {
      const value = credentialsSchema.parse(
        JSON.parse(unseal(ciphertext, encryptionKey!)),
      );
      if (value.appId !== appId || value.redirectUri !== redirectUri)
        throw new HttpError(
          409,
          "VKID_RECONNECT_REQUIRED",
          "Настройки VK ID изменились. Подключите фотографии снова.",
        );
      return value;
    };
    if (saved.expiresAt > Date.now() + 120000)
      return decode(saved.ciphertext).accessToken;
    // Cross-process serialization prevents reuse of a rotated refresh token.
    return database.client.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
        const current = await tx.appSetting.findUnique({ where: { key } });
        if (!current) throw new Error("VKID_CONNECTION_MISSING");
        const record = recordSchema.parse(current.value),
          credentials = decode(record.ciphertext);
        if (record.expiresAt > Date.now() + 120000)
          return credentials.accessToken;
        try {
          const refreshed = await exchange({
            grant_type: "refresh_token",
            client_id: credentials.appId,
            redirect_uri: credentials.redirectUri,
            device_id: credentials.deviceId,
            refresh_token: credentials.refreshToken,
            state: nonce(),
          });
          if (
            refreshed.user_id != null &&
            credentials.userId &&
            String(refreshed.user_id) !== credentials.userId
          )
            throw new Error("VKID_USER_MISMATCH");
          const value = {
            ...record,
            ciphertext: seal(
              JSON.stringify({
                ...credentials,
                accessToken: refreshed.access_token,
                refreshToken: refreshed.refresh_token,
              }),
              encryptionKey!,
            ),
            expiresAt: Date.now() + refreshed.expires_in * 1000,
            lastRefreshAt: new Date().toISOString(),
          };
          await tx.appSetting.update({ where: { key }, data: { value } });
          return refreshed.access_token;
        } catch {
          throw new HttpError(
            503,
            "VKID_REFRESH_FAILED",
            "VK ID не обновил доступ к фото. Повторите проверку подключения; при отзыве доступа потребуется вход в VK.",
          );
        }
      },
      { maxWait: 20000, timeout: 25000 },
    );
  };
  return { start, complete, getToken, status };
};
