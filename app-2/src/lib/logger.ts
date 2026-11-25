import pino, { type Logger } from "pino";

export const createLogger = (): Logger =>
  pino({
    redact: {
      paths: [
        "DATABASE_URL",
        "databaseUrl",
        "connectionString",
        "*.DATABASE_URL",
        "*.databaseUrl",
        "*.connectionString",
        "req.headers.authorization",
        "req.headers.cookie",
        'req.headers["api-key"]',
        "clientSecret",
        "*.clientSecret",
        "TRAVELLINE_CLIENT_SECRET",
        "TRAVELLINE_WEBHOOK_SECRET",
      ],
      remove: true,
    },
  });
