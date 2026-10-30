import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { z } from "zod";

import type { AdminPushEnvironment } from "../features/admin-push/admin-push.types.js";

const GENERATED_ENV_PATH = "AMAZI_ENV_GENERATED.env";

if (existsSync(GENERATED_ENV_PATH)) loadEnvFile(GENERATED_ENV_PATH);

const databaseUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "postgres:" || protocol === "postgresql:";
  }, "DATABASE_URL must use the postgres or postgresql protocol.");

const optionalTrimmedEnvironmentValue = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(1).optional(),
);

const environmentSchema = z
  .object({
    AMAZI_STORAGE_API_URL: z.string().url(),
    AMAZI_STORAGE_PROJECT_TOKEN: z.string().min(32),
    PUBLIC_MEDIA_BASE_URL: z.string().url().optional(),
    VITE_API_DEVELOPMENT_URL: z.string().url().optional(),
    VITE_API_PRODUCTION_URL: z.string().url().optional(),
    AMAZI_PREVIEW_FRONTEND_HOST: z.string().trim().min(1).optional(),
    AMAZI_PREVIEW_HOST: z.string().trim().min(1).optional(),
    AMAZI_PROXY_URL: z.string().url().optional(),
    AMAZI_PROXY_KEY: z.string().min(1).optional(),
    CORS_ALLOWED_ORIGINS: z.string().min(1),
    DATABASE_URL: databaseUrlSchema,
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    EPTERA_API_KEY: z.string().min(1).optional(),
    EPTERA_HOTEL_ID: z.string().regex(/^\d+$/).optional(),
    EPTERA_ENABLED: z.stringbool().default(true),
    EPTERA_PAYMENT_LOGIN_TOKEN: z.string().min(1).optional(),
    EPTERA_RESERVATION_LOGIN_TOKEN: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    AMAZI_AI_GATEWAY_OPENAI_API_KEY: z.string().min(1).optional(),
    AMAZI_AI_GATEWAY_OPENAI_BASE_URL: z.string().url().optional(),
    OPENAI_SIP_API_KEY: z.string().min(1).optional(),
    OPENAI_SIP_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
    OPENAI_SIP_WEBHOOK_SECRET: z.string().min(1).optional(),
    AMAZI_VOICE_CONFIGURATION_SECRET: z.string().min(1).optional(),
    ADMIN_WEB_PUSH_VAPID_PUBLIC_KEY: z.string().min(32).optional(),
    ADMIN_WEB_PUSH_VAPID_PRIVATE_KEY: z.string().min(32).optional(),
    YOOKASSA_SECRET_KEY: z.string().min(1).optional(),
    YOOKASSA_SHOP_ID: z.string().min(1).optional(),
    MANGO_API_BASE_URL: z.string().url().optional(),
    MANGO_API_KEY: z.string().min(1).optional(),
    MANGO_API_SECRET: z.string().min(1).optional(),
    MANGO_VPBX_API_KEY: z.string().min(1).optional(),
    MANGO_VPBX_API_SALT: z.string().min(1).optional(),
    VOICE_AGENT_PUBLIC_WEBHOOK_URL: z.string().url().optional(),
    MAX_BOT_TOKEN: z.string().min(1).optional(),
    MAX_WEBHOOK_SECRET: z.string().min(16).optional(),
    MAX_BOT_WEBHOOK_URL: z.string().url().optional(),
    MAX_BOT_SITE_URL: z.string().url().optional(),
    MAX_PUBLISH_CHAT_ID: z
      .string()
      .regex(/^-?\d+$/u)
      .optional(),
    TELEGRAM_BOT_TOKEN: z.string().trim().min(1).optional(),
    TELEGRAM_PUBLISH_CHAT_ID: optionalTrimmedEnvironmentValue,
    META_INSTAGRAM_APP_ID: optionalTrimmedEnvironmentValue,
    META_INSTAGRAM_APP_SECRET: optionalTrimmedEnvironmentValue,
    META_INSTAGRAM_TARGET_USERNAME: z
      .string()
      .trim()
      .regex(/^@?[A-Za-z0-9._]{1,30}$/u)
      .optional(),
    META_INSTAGRAM_TARGET_PAGE_ID: z.string().regex(/^\d+$/u).optional(),
    META_INSTAGRAM_REDIRECT_URI: z.string().url().optional(),
    INSTAGRAM_TOKEN_ENCRYPTION_KEY: z.string().optional(),
    VK_ACCESS_TOKEN: z.string().min(1).optional(),
    VK_ACCESS_TOKEN_OVERRIDE: optionalTrimmedEnvironmentValue,
    VK_PHOTO_UPLOAD_ACCESS_TOKEN: optionalTrimmedEnvironmentValue,
    VK_GROUP_ID: z.string().regex(/^\d+$/u).optional(),
    VK_CALLBACK_SECRET: z.string().min(1).optional(),
    VK_CALLBACK_SECRET_OVERRIDE: optionalTrimmedEnvironmentValue,
    VK_CALLBACK_CONFIRMATION_CODE: z.string().min(1).optional(),
    VK_CALLBACK_CONFIRMATION_RESPONSE: optionalTrimmedEnvironmentValue,
    MAIL_RU_EMAIL: z.string().email().optional(),
    MAIL_RU_APP_PASSWORD: z.string().min(1).optional(),
  })
  .refine(
    (environment) =>
      Boolean(environment.ADMIN_WEB_PUSH_VAPID_PUBLIC_KEY) ===
      Boolean(environment.ADMIN_WEB_PUSH_VAPID_PRIVATE_KEY),
    {
      message:
        "ADMIN_WEB_PUSH_VAPID_PUBLIC_KEY and ADMIN_WEB_PUSH_VAPID_PRIVATE_KEY must be configured together.",
    },
  )
  .refine(
    (environment) =>
      Boolean(environment.AMAZI_PROXY_URL) ===
      Boolean(environment.AMAZI_PROXY_KEY),
    {
      message:
        "AMAZI_PROXY_URL and AMAZI_PROXY_KEY must be configured together.",
    },
  );

export type AppConfig = {
  readonly aiGatewayOpenai: {
    readonly apiKey?: string;
    readonly baseUrl?: string;
  };
  readonly databaseUrl: string;
  readonly corsAllowedOrigins: readonly string[];
  readonly epteraEnabled: boolean;
  readonly epteraApiKey?: string;
  readonly epteraHotelId?: string;
  readonly epteraPaymentLoginToken?: string;
  readonly epteraReservationLoginToken?: string;
  readonly managedStorage: {
    readonly apiUrl: string;
    readonly projectToken: string;
  };
  readonly nodeEnv: z.infer<typeof environmentSchema>["NODE_ENV"];
  readonly port: number;
  readonly openaiApiKey?: string;
  readonly openaiBaseUrl?: string;
  readonly openaiSip: {
    readonly apiKey?: string;
    readonly baseUrl: string;
    readonly webhookSecret?: string;
  };
  readonly voiceConfigurationSecret?: string;
  readonly adminPush: {
    readonly environment: AdminPushEnvironment;
    readonly privateKey?: string;
    readonly publicKey?: string;
    readonly subject: string;
  };
  readonly maxBot: {
    readonly token?: string;
    readonly webhookSecret?: string;
    readonly webhookUrl?: string;
    readonly siteUrl?: string;
    readonly publishChatId?: string;
  };
  readonly telegram: {
    readonly token?: string;
    readonly publishChatId?: string;
    readonly proxyUrl?: string;
    readonly proxyKey?: string;
  };
  readonly vk: {
    readonly accessToken?: string;
    readonly photoUploadAccessToken?: string;
    readonly groupId?: string;
    readonly callbackSecret?: string;
    readonly confirmationCode?: string;
  };
  readonly yooKassaSecretKey?: string;
  readonly yooKassaShopId?: string;
  readonly voiceIntegration: {
    readonly mangoApiBaseUrl?: string;
    readonly mangoApiKey?: string;
    readonly mangoApiSalt?: string;
    readonly mangoConfigured: boolean;
    readonly publicWebhookConfigured: boolean;
  };
  readonly mailRu: { readonly email?: string; readonly password?: string };
  readonly instagramPublishing: {
    readonly appId?: string;
    readonly appSecret?: string;
    readonly targetUsername?: string;
    readonly targetPageId?: string;
    readonly redirectUri?: string;
    readonly previewHost?: string;
    readonly tokenEncryptionKey?: string;
    readonly proxyUrl?: string;
    readonly proxyKey?: string;
    readonly publicMediaBaseUrl?: string;
    readonly graphApiVersion: string;
  };
};

export const readConfig = (
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig => {
  const parsed = environmentSchema.parse(environment);
  return {
    databaseUrl: parsed.DATABASE_URL,
    aiGatewayOpenai: {
      apiKey: parsed.AMAZI_AI_GATEWAY_OPENAI_API_KEY,
      baseUrl: parsed.AMAZI_AI_GATEWAY_OPENAI_BASE_URL,
    },
    corsAllowedOrigins: parseCorsOrigins(
      parsed.CORS_ALLOWED_ORIGINS,
      parsed.NODE_ENV === "development"
        ? parsed.AMAZI_PREVIEW_FRONTEND_HOST
        : undefined,
    ),
    epteraEnabled: parsed.EPTERA_ENABLED,
    epteraApiKey: parsed.EPTERA_API_KEY,
    epteraHotelId: parsed.EPTERA_HOTEL_ID,
    epteraPaymentLoginToken: parsed.EPTERA_PAYMENT_LOGIN_TOKEN,
    epteraReservationLoginToken:
      parsed.EPTERA_RESERVATION_LOGIN_TOKEN ??
      parsed.EPTERA_PAYMENT_LOGIN_TOKEN,
    managedStorage: {
      apiUrl: parsed.AMAZI_STORAGE_API_URL,
      projectToken: parsed.AMAZI_STORAGE_PROJECT_TOKEN,
    },
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    openaiApiKey:
      parsed.AMAZI_AI_GATEWAY_OPENAI_API_KEY ?? parsed.OPENAI_API_KEY,
    openaiBaseUrl: parsed.AMAZI_AI_GATEWAY_OPENAI_BASE_URL,
    openaiSip: {
      apiKey: parsed.OPENAI_SIP_API_KEY,
      baseUrl: parsed.OPENAI_SIP_BASE_URL,
      webhookSecret: parsed.OPENAI_SIP_WEBHOOK_SECRET,
    },
    voiceConfigurationSecret: parsed.AMAZI_VOICE_CONFIGURATION_SECRET,
    adminPush: {
      environment:
        parsed.NODE_ENV === "production" ? "production" : "development",
      privateKey: parsed.ADMIN_WEB_PUSH_VAPID_PRIVATE_KEY,
      publicKey: parsed.ADMIN_WEB_PUSH_VAPID_PUBLIC_KEY,
      subject: "https://alsma.ru",
    },
    maxBot: {
      token: parsed.MAX_BOT_TOKEN,
      webhookSecret: parsed.MAX_WEBHOOK_SECRET,
      webhookUrl: parsed.MAX_BOT_WEBHOOK_URL,
      siteUrl: parsed.MAX_BOT_SITE_URL,
      publishChatId: parsed.MAX_PUBLISH_CHAT_ID,
    },
    telegram: {
      token: parsed.TELEGRAM_BOT_TOKEN,
      publishChatId: parsed.TELEGRAM_PUBLISH_CHAT_ID,
      proxyUrl: parsed.AMAZI_PROXY_URL,
      proxyKey: parsed.AMAZI_PROXY_KEY,
    },
    vk: {
      // The connected VK integration cannot have its credential edited in
      // place. An explicit token value lets the project use a newly issued
      // community key without disconnecting the integration and losing its
      // group, callback secret, and confirmation settings.
      accessToken: parsed.VK_ACCESS_TOKEN_OVERRIDE ?? parsed.VK_ACCESS_TOKEN,
      // VK photo-upload methods require user authorization. Keep that token
      // separate so the community credential continues to handle bot traffic.
      photoUploadAccessToken: parsed.VK_PHOTO_UPLOAD_ACCESS_TOKEN,
      groupId: parsed.VK_GROUP_ID,
      // A re-created Callback API server brings a new secret that cannot be
      // edited inside the connected integration, so an explicit value wins.
      callbackSecret:
        parsed.VK_CALLBACK_SECRET_OVERRIDE ?? parsed.VK_CALLBACK_SECRET,
      // VK compares the confirmation body byte-for-byte with the string shown
      // in the community Callback API settings. The integration value can be
      // stale after the server is re-created, and connected integration
      // credentials cannot be edited in place, so an explicit response value
      // takes precedence when present.
      confirmationCode:
        parsed.VK_CALLBACK_CONFIRMATION_RESPONSE ??
        parsed.VK_CALLBACK_CONFIRMATION_CODE,
    },
    yooKassaSecretKey: parsed.YOOKASSA_SECRET_KEY,
    yooKassaShopId: parsed.YOOKASSA_SHOP_ID,
    voiceIntegration: {
      mangoApiBaseUrl: parsed.MANGO_API_BASE_URL,
      mangoApiKey: parsed.MANGO_VPBX_API_KEY,
      mangoApiSalt: parsed.MANGO_VPBX_API_SALT,
      mangoConfigured: Boolean(
        (parsed.MANGO_VPBX_API_KEY && parsed.MANGO_VPBX_API_SALT) ||
        (parsed.MANGO_API_BASE_URL &&
          parsed.MANGO_API_KEY &&
          parsed.MANGO_API_SECRET),
      ),
      publicWebhookConfigured: Boolean(parsed.VOICE_AGENT_PUBLIC_WEBHOOK_URL),
    },
    mailRu: {
      email: parsed.MAIL_RU_EMAIL,
      password: parsed.MAIL_RU_APP_PASSWORD,
    },
    instagramPublishing: {
      appId: parsed.META_INSTAGRAM_APP_ID,
      appSecret: parsed.META_INSTAGRAM_APP_SECRET,
      targetUsername: parsed.META_INSTAGRAM_TARGET_USERNAME?.replace(/^@/u, ""),
      targetPageId: parsed.META_INSTAGRAM_TARGET_PAGE_ID,
      redirectUri: parsed.META_INSTAGRAM_REDIRECT_URI,
      previewHost:
        parsed.NODE_ENV === "development"
          ? parsed.AMAZI_PREVIEW_HOST
          : undefined,
      tokenEncryptionKey: parsed.INSTAGRAM_TOKEN_ENCRYPTION_KEY,
      proxyUrl: parsed.AMAZI_PROXY_URL,
      proxyKey: parsed.AMAZI_PROXY_KEY,
      // Meta downloads feed images from the public internet, so the shared
      // storage URL is replaced by this project's public media endpoint.
      publicMediaBaseUrl:
        parsed.PUBLIC_MEDIA_BASE_URL ??
        parsed.VITE_API_PRODUCTION_URL ??
        parsed.VITE_API_DEVELOPMENT_URL,
      graphApiVersion: "v26.0",
    },
  };
};

const parseCorsOrigins = (value: string, previewHost?: string): string[] => {
  const origins = value
    .split(/[\s,]+/u)
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      const parsed = new URL(origin);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
        throw new Error("CORS_ALLOWED_ORIGINS must contain HTTP(S) origins.");
      if (parsed.pathname !== "/" || parsed.search || parsed.hash)
        throw new Error("CORS_ALLOWED_ORIGINS must contain origins only.");
      return parsed.origin;
    });

  if (origins.length === 0)
    throw new Error("CORS_ALLOWED_ORIGINS must contain at least one origin.");

  const previewOrigin = previewHost
    ? parsePreviewOrigin(previewHost)
    : undefined;

  return [...new Set([...origins, ...(previewOrigin ? [previewOrigin] : [])])];
};

const parsePreviewOrigin = (host: string): string => {
  const parsed = new URL(`https://${host}`);
  if (
    parsed.hostname !== host.toLowerCase() ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      "AMAZI_PREVIEW_FRONTEND_HOST must contain a hostname only.",
    );
  }
  return parsed.origin;
};
