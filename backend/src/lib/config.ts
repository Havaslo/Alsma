import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { z } from "zod";

const GENERATED_ENV_PATH = "AMAZI_ENV_GENERATED.env";

if (existsSync(GENERATED_ENV_PATH)) {
  loadEnvFile(GENERATED_ENV_PATH);
}

const databaseUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "postgres:" || protocol === "postgresql:";
  }, "DATABASE_URL must use the postgres or postgresql protocol.");

const environmentSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
});

export type AppConfig = {
  readonly databaseUrl: string;
  readonly nodeEnv: z.infer<typeof environmentSchema>["NODE_ENV"];
  readonly port: number;
};

export const readConfig = (
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig => {
  const parsed = environmentSchema.parse(environment);
  return {
    databaseUrl: parsed.DATABASE_URL,
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
  };
};
