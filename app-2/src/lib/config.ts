import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { z } from "zod";

const GENERATED_ENV_PATH = "AMAZI_ENV_GENERATED.env";

if (existsSync(GENERATED_ENV_PATH)) loadEnvFile(GENERATED_ENV_PATH);

const databaseUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "postgres:" || protocol === "postgresql:";
  }, "DATABASE_URL must use the postgres or postgresql protocol.");

const environmentSchema = z.object({
  AMAZI_STORAGE_API_URL: z.string().url(),
  AMAZI_STORAGE_PROJECT_TOKEN: z.string().min(32),
  CORS_ALLOWED_ORIGINS: z.string().min(1),
  DATABASE_URL: databaseUrlSchema,
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  EPTERA_API_KEY: z.string().min(1).optional(),
  EPTERA_HOTEL_ID: z.string().regex(/^\d+$/).optional(),
  EPTERA_PAYMENT_LOGIN_TOKEN: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  AMAZI_AI_GATEWAY_OPENAI_API_KEY: z.string().min(1).optional(),
  AMAZI_AI_GATEWAY_OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_SIP_API_KEY: z.string().min(1).optional(),
  OPENAI_SIP_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_SIP_WEBHOOK_SECRET: z.string().min(1).optional(),
  AMAZI_VOICE_CONFIGURATION_SECRET: z.string().min(1).optional(),
  YOOKASSA_SECRET_KEY: z.string().min(1).optional(),
  YOOKASSA_SHOP_ID: z.string().min(1).optional(),
  MANGO_API_BASE_URL: z.string().url().optional(),
  MANGO_API_KEY: z.string().min(1).optional(),
  MANGO_API_SECRET: z.string().min(1).optional(),
  MANGO_VPBX_API_KEY: z.string().min(1).optional(),
  MANGO_VPBX_API_SALT: z.string().min(1).optional(),
  T2_TRANSFER_NUMBER: z.string().min(3).optional(),
  VOICE_AGENT_PUBLIC_WEBHOOK_URL: z.string().url().optional(),
  MAX_BOT_TOKEN: z.string().min(1).optional(),
  MAX_WEBHOOK_SECRET: z.string().min(16).optional(),
  MAX_BOT_WEBHOOK_URL: z.string().url().optional(),
  MAX_BOT_SITE_URL: z.string().url().optional(),
  VK_ACCESS_TOKEN: z.string().min(1).optional(),
  VK_GROUP_ID: z.string().regex(/^\d+$/u).optional(),
  VK_CALLBACK_SECRET: z.string().min(1).optional(),
  VK_CALLBACK_CONFIRMATION_CODE: z.string().min(1).optional(),
  MAIL_RU_EMAIL: z.string().email().optional(),
  MAIL_RU_APP_PASSWORD: z.string().min(1).optional(),
});

export type AppConfig = {
  readonly databaseUrl: string;
  readonly corsAllowedOrigins: readonly string[];
  readonly epteraApiKey?: string;
  readonly epteraHotelId?: string;
  readonly epteraPaymentLoginToken?: string;
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
  readonly maxBot: {
    readonly token?: string;
    readonly webhookSecret?: string;
    readonly webhookUrl?: string;
    readonly siteUrl?: string;
  };
  readonly vk: {
    readonly accessToken?: string;
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
    readonly t2TransferConfigured: boolean;
    readonly publicWebhookConfigured: boolean;
    readonly transferNumber?: string;
  };
  readonly mailRu: { readonly email?: string; readonly password?: string };
};

export const readConfig = (
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig => {
  const parsed = environmentSchema.parse(environment);
  return {
    databaseUrl: parsed.DATABASE_URL,
    corsAllowedOrigins: parseCorsOrigins(parsed.CORS_ALLOWED_ORIGINS),
    epteraApiKey: parsed.EPTERA_API_KEY,
    epteraHotelId: parsed.EPTERA_HOTEL_ID,
    epteraPaymentLoginToken: parsed.EPTERA_PAYMENT_LOGIN_TOKEN,
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
    maxBot: {
      token: parsed.MAX_BOT_TOKEN,
      webhookSecret: parsed.MAX_WEBHOOK_SECRET,
      webhookUrl: parsed.MAX_BOT_WEBHOOK_URL,
      siteUrl: parsed.MAX_BOT_SITE_URL,
    },
    vk: {
      accessToken: parsed.VK_ACCESS_TOKEN,
      groupId: parsed.VK_GROUP_ID,
      callbackSecret: parsed.VK_CALLBACK_SECRET,
      confirmationCode: parsed.VK_CALLBACK_CONFIRMATION_CODE,
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
      t2TransferConfigured: Boolean(parsed.T2_TRANSFER_NUMBER),
      publicWebhookConfigured: Boolean(parsed.VOICE_AGENT_PUBLIC_WEBHOOK_URL),
      transferNumber: parsed.T2_TRANSFER_NUMBER,
    },
    mailRu: {
      email: parsed.MAIL_RU_EMAIL,
      password: parsed.MAIL_RU_APP_PASSWORD,
    },
  };
};

const parseCorsOrigins = (value: string): string[] => {
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

  return [...new Set(origins)];
};
