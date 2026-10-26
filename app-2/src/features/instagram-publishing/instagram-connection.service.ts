import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import {
  MetaGraphRequestError,
  findTargetInstagram,
} from "./instagram-page-discovery.js";

const stateLifetimeMilliseconds = 10 * 60_000;
const authorizationScopes = [
  "pages_show_list",
  "instagram_basic",
  "instagram_content_publish",
  "pages_read_engagement",
  "business_management",
] as const;

export type InstagramPublishingConfiguration = {
  readonly appId?: string;
  readonly appSecret?: string;
  readonly targetUsername?: string;
  readonly targetPageId?: string;
  readonly redirectUri?: string;
  readonly previewHost?: string;
  readonly tokenEncryptionKey?: string;
  readonly proxyUrl?: string;
  readonly proxyKey?: string;
  readonly graphApiVersion: string;
};

type OAuthState = {
  readonly redirectUri: string;
  readonly returnOrigin: string;
};

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const isConfigured = (configuration: InstagramPublishingConfiguration) =>
  Boolean(
    configuration.appId &&
    configuration.appSecret &&
    configuration.targetUsername &&
    configuration.tokenEncryptionKey &&
    configuration.proxyUrl &&
    configuration.proxyKey &&
    (configuration.redirectUri || configuration.previewHost),
  );

const encryptionKey = (value: string | undefined): Buffer => {
  if (!value) throw new Error("Instagram token encryption is not configured");
  const key = Buffer.from(value, "base64");
  if (key.byteLength !== 32)
    throw new Error("Instagram token encryption key must contain 32 bytes");
  return key;
};

export const encryptInstagramToken = (
  token: string,
  keyValue: string,
  nonce = randomBytes(12),
): string => {
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyValue), nonce);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    nonce.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
};

export const decryptInstagramToken = (
  encrypted: string,
  keyValue: string,
): string => {
  const [version, nonceValue, tagValue, ciphertextValue] = encrypted.split(".");
  if (version !== "v1" || !nonceValue || !tagValue || !ciphertextValue)
    throw new Error("Instagram token ciphertext is invalid");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(keyValue),
    Buffer.from(nonceValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

export const createInstagramConnectionService = (options: {
  readonly allowedOrigins: readonly string[];
  readonly configuration: InstagramPublishingConfiguration;
  readonly database: Database;
  readonly environment: "development" | "production" | "test";
  readonly fetchImplementation?: typeof fetch;
  readonly logger: Logger;
}) => {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const configuration = options.configuration;
  const returnFallback =
    options.allowedOrigins.find((origin) =>
      new URL(origin).hostname.endsWith("alsma.ru"),
    ) ?? options.allowedOrigins[0]!;

  const callbackUri = (): string | null => {
    if (options.environment === "development" && configuration.previewHost) {
      const host = configuration.previewHost.trim();
      if (!/^[a-z0-9.-]+$/iu.test(host)) return null;
      return `https://${host}/api/instagram-publishing/callback`;
    }
    return configuration.redirectUri ?? null;
  };

  const requestMeta = async (
    url: URL,
    init: {
      readonly method?: "GET";
      readonly headers?: Record<string, string>;
    } = {},
  ): Promise<Record<string, unknown>> => {
    if (!configuration.proxyUrl || !configuration.proxyKey)
      throw new Error("Instagram outbound proxy is not configured");
    const response = await fetchImplementation(configuration.proxyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.proxyKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url.toString(),
        method: init.method ?? "GET",
        headers: init.headers ?? {},
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    const data = record(payload);
    const providerError = record(data?.error);
    if (!response.ok || data?.error)
      throw new MetaGraphRequestError(
        response.status,
        typeof providerError?.code === "number" ? providerError.code : null,
      );
    if (!data) throw new Error("Meta API returned an invalid response");
    return data;
  };

  const graphUrl = (path: string) =>
    new URL(
      `https://graph.facebook.com/${configuration.graphApiVersion}/${path}`,
    );

  const graphGet = (
    path: string,
    accessToken: string,
    fields?: string,
    parameters?: Record<string, string>,
  ) => {
    const url = graphUrl(path);
    if (fields) url.searchParams.set("fields", fields);
    for (const [key, value] of Object.entries(parameters ?? {}))
      url.searchParams.set(key, value);
    return requestMeta(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  };

  const start = async (origin: string | undefined) => {
    const redirectUri = callbackUri();
    if (!isConfigured(configuration) || !redirectUri)
      return { configured: false as const };
    if (!origin || !options.allowedOrigins.includes(origin))
      throw new Error(
        "The admin page origin is not allowed for Instagram OAuth",
      );

    const state = randomBytes(32).toString("base64url");
    const stateHash = createHash("sha256").update(state).digest("hex");
    const now = new Date();
    await options.database.client.instagramOAuthState.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    await options.database.client.instagramOAuthState.create({
      data: {
        stateHash,
        redirectUri,
        returnOrigin: origin,
        expiresAt: new Date(now.getTime() + stateLifetimeMilliseconds),
      },
    });

    const authorizationUrl = new URL(
      `https://www.facebook.com/${configuration.graphApiVersion}/dialog/oauth`,
    );
    authorizationUrl.searchParams.set("client_id", configuration.appId!);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", authorizationScopes.join(","));
    authorizationUrl.searchParams.set("state", state);
    return {
      configured: true as const,
      authorizationUrl: authorizationUrl.toString(),
    };
  };

  const exchangeCode = async (code: string, redirectUri: string) => {
    const url = graphUrl("oauth/access_token");
    url.searchParams.set("client_id", configuration.appId!);
    url.searchParams.set("client_secret", configuration.appSecret!);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code", code);
    const result = await requestMeta(url);
    const accessToken = text(result.access_token);
    if (!accessToken) throw new Error("Meta did not return a user token");
    return accessToken;
  };

  const exchangeLongLivedToken = async (shortLivedToken: string) => {
    const url = graphUrl("oauth/access_token");
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", configuration.appId!);
    url.searchParams.set("client_secret", configuration.appSecret!);
    url.searchParams.set("fb_exchange_token", shortLivedToken);
    const result = await requestMeta(url);
    const accessToken = text(result.access_token);
    if (!accessToken) throw new Error("Meta did not return a long-lived token");
    const expiresIn = Number(result.expires_in);
    return {
      accessToken,
      expiresAt:
        Number.isFinite(expiresIn) && expiresIn > 0
          ? new Date(Date.now() + expiresIn * 1_000)
          : null,
    };
  };

  const missingGrantedScopes = async (userToken: string) => {
    try {
      const result = await graphGet(
        "me/permissions",
        userToken,
        "permission,status",
        { limit: "100" },
      );
      if (!Array.isArray(result.data)) return null;
      const granted = new Set(
        result.data
          .map(record)
          .filter((item) => item?.status === "granted")
          .map((item) => text(item?.permission)),
      );
      return authorizationScopes.filter((scope) => !granted.has(scope));
    } catch (error) {
      options.logger.warn(
        {
          stage: "permissions_lookup",
          httpStatus:
            error instanceof MetaGraphRequestError ? error.httpStatus : null,
          providerCode:
            error instanceof MetaGraphRequestError ? error.providerCode : null,
        },
        "Instagram grant diagnostics could not be read",
      );
      return null;
    }
  };

  const complete = async (input: {
    readonly code?: string;
    readonly error?: string;
    readonly state?: string;
  }) => {
    const stateHash = input.state
      ? createHash("sha256").update(input.state).digest("hex")
      : "";
    const now = new Date();
    const claimed = stateHash
      ? await options.database.client.instagramOAuthState.updateMany({
          data: { consumedAt: now },
          where: {
            stateHash,
            consumedAt: null,
            expiresAt: { gt: now },
          },
        })
      : { count: 0 };
    if (claimed.count !== 1)
      return { returnOrigin: returnFallback, result: "invalid_state" as const };
    const state = await options.database.client.instagramOAuthState.findUnique({
      where: { stateHash },
      select: { redirectUri: true, returnOrigin: true },
    });
    const returnOrigin =
      state && options.allowedOrigins.includes(state.returnOrigin)
        ? state.returnOrigin
        : returnFallback;
    if (!state) return { returnOrigin, result: "invalid_state" as const };
    if (input.error)
      return { returnOrigin, result: "authorization_cancelled" as const };
    if (!input.code || !isConfigured(configuration))
      return { returnOrigin, result: "not_configured" as const };

    let stage = "code_exchange";
    try {
      const shortLivedToken = await exchangeCode(input.code, state.redirectUri);
      stage = "long_lived_token";
      const longLived = await exchangeLongLivedToken(shortLivedToken);
      stage = "page_discovery";
      const discovered = await findTargetInstagram({
        graphGet,
        logger: options.logger,
        targetPageId: configuration.targetPageId,
        targetUsername: configuration.targetUsername!,
        userToken: longLived.accessToken,
      });
      if (!discovered.target) {
        const missingScopes = await missingGrantedScopes(longLived.accessToken);
        options.logger.warn(
          { ...discovered, missingScopes, stage },
          "Instagram account was not visible after Meta authorization",
        );
        return {
          returnOrigin,
          result:
            missingScopes && missingScopes.length > 0
              ? ("instagram_permissions_missing" as const)
              : discovered.reason,
        };
      }
      const target = discovered.target;
      stage = "saving_connection";
      const encryptedAccessToken = encryptInstagramToken(
        target.pageToken,
        configuration.tokenEncryptionKey!,
      );
      await options.database.client.instagramChannelConnection.upsert({
        where: { provider: "instagram" },
        create: {
          provider: "instagram",
          instagramUserId: target.instagramId,
          username: target.username,
          facebookPageId: target.pageId,
          encryptedAccessToken,
          tokenExpiresAt: longLived.expiresAt,
        },
        update: {
          instagramUserId: target.instagramId,
          username: target.username,
          facebookPageId: target.pageId,
          encryptedAccessToken,
          tokenExpiresAt: longLived.expiresAt,
          connectedAt: now,
        },
      });
      return { returnOrigin, result: "connected" as const };
    } catch (error) {
      options.logger.warn(
        {
          stage,
          errorName: error instanceof Error ? error.name : "UnknownError",
          httpStatus:
            error instanceof MetaGraphRequestError ? error.httpStatus : null,
          providerCode:
            error instanceof MetaGraphRequestError ? error.providerCode : null,
        },
        "Instagram account connection failed",
      );
      return { returnOrigin, result: "provider_error" as const };
    }
  };

  const status = async () => {
    const connection =
      await options.database.client.instagramChannelConnection.findUnique({
        where: { provider: "instagram" },
        select: { username: true, tokenExpiresAt: true, connectedAt: true },
      });
    const expired = Boolean(
      connection?.tokenExpiresAt && connection.tokenExpiresAt <= new Date(),
    );
    return {
      configured: isConfigured(configuration),
      connected: Boolean(connection && !expired),
      needsReconnect: Boolean(connection && expired),
      username: connection?.username ?? null,
      targetUsername: configuration.targetUsername ?? null,
      connectedAt: connection?.connectedAt?.toISOString() ?? null,
      publishingEnabled: false,
    };
  };

  return { complete, start, status };
};
