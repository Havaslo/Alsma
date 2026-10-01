export type AdminPushEnvironment = "development" | "production";

export type AdminPushConfiguration = {
  readonly environment: AdminPushEnvironment;
  readonly privateKey?: string;
  readonly publicKey?: string;
  readonly subject: string;
};
