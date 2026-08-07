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
  YOOKASSA_SECRET_KEY: z.string().min(1).optional(),
  YOOKASSA_SHOP_ID: z.string().min(1).optional(),
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
  readonly yooKassaSecretKey?: string;
  readonly yooKassaShopId?: string;
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
    openaiApiKey: parsed.OPENAI_API_KEY,
    yooKassaSecretKey: parsed.YOOKASSA_SECRET_KEY,
    yooKassaShopId: parsed.YOOKASSA_SHOP_ID,
  };
};
