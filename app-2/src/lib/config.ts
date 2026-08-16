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
  DATABASE_URL: databaseUrlSchema,
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  EPTERA_API_KEY: z.string().min(1).optional(),
  EPTERA_HOTEL_ID: z.string().regex(/^\d+$/).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  AMAZI_AI_GATEWAY_OPENAI_API_KEY: z.string().min(1).optional(),
  AMAZI_AI_GATEWAY_OPENAI_BASE_URL: z.string().url().optional(),
  YOOKASSA_SECRET_KEY: z.string().min(1).optional(),
  YOOKASSA_SHOP_ID: z.string().min(1).optional(),
  MANGO_API_BASE_URL: z.string().url().optional(),
  MANGO_API_KEY: z.string().min(1).optional(),
  MANGO_API_SECRET: z.string().min(1).optional(),
  MANGO_SIP_TRUNK_URI: z.string().min(1).optional(),
  SBC_PUBLIC_BASE_URL: z.string().url().optional(),
  SBC_WEBHOOK_SECRET: z.string().min(1).optional(),
  OPENAI_REALTIME_SIP_BASE_URL: z.string().url().optional(),
  OPENAI_REALTIME_SIP_API_KEY: z.string().min(1).optional(),
  OPENAI_REALTIME_SIP_PROJECT_ID: z.string().min(1).optional(),
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
});

export type AppConfig = {
  readonly databaseUrl: string;
  readonly epteraApiKey?: string;
  readonly epteraHotelId?: string;
  readonly managedStorage: {
    readonly apiUrl: string;
    readonly projectToken: string;
  };
  readonly nodeEnv: z.infer<typeof environmentSchema>["NODE_ENV"];
  readonly port: number;
  readonly openaiApiKey?: string;
  readonly openaiBaseUrl?: string;
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
    readonly mangoConfigured: boolean;
    readonly sbcConfigured: boolean;
    readonly realtimeSipConfigured: boolean;
    readonly t2TransferConfigured: boolean;
    readonly publicWebhookConfigured: boolean;
  };
};

export const readConfig = (
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig => {
  const parsed = environmentSchema.parse(environment);
  return {
    databaseUrl: parsed.DATABASE_URL,
    epteraApiKey: parsed.EPTERA_API_KEY,
    epteraHotelId: parsed.EPTERA_HOTEL_ID,
    managedStorage: {
      apiUrl: parsed.AMAZI_STORAGE_API_URL,
      projectToken: parsed.AMAZI_STORAGE_PROJECT_TOKEN,
    },
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    openaiApiKey:
      parsed.AMAZI_AI_GATEWAY_OPENAI_API_KEY ?? parsed.OPENAI_API_KEY,
    openaiBaseUrl: parsed.AMAZI_AI_GATEWAY_OPENAI_BASE_URL,
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
      mangoConfigured: Boolean(
        parsed.MANGO_API_BASE_URL &&
        parsed.MANGO_API_KEY &&
        parsed.MANGO_API_SECRET,
      ),
      sbcConfigured: Boolean(
        parsed.SBC_PUBLIC_BASE_URL && parsed.SBC_WEBHOOK_SECRET,
      ),
      realtimeSipConfigured: Boolean(
        parsed.OPENAI_REALTIME_SIP_BASE_URL &&
        parsed.OPENAI_REALTIME_SIP_API_KEY &&
        parsed.OPENAI_REALTIME_SIP_PROJECT_ID,
      ),
      t2TransferConfigured: Boolean(parsed.T2_TRANSFER_NUMBER),
      publicWebhookConfigured: Boolean(parsed.VOICE_AGENT_PUBLIC_WEBHOOK_URL),
    },
  };
};
