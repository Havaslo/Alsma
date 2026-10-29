import type { Logger } from "pino";

export class MetaGraphRequestError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly providerCode: number | null,
    readonly providerMessage: string | null = null,
  ) {
    super("Meta Graph API request failed");
    this.name = "MetaGraphRequestError";
  }
}

export type InstagramGraphConfiguration = {
  readonly graphApiVersion: string;
  readonly proxyKey?: string;
  readonly proxyUrl?: string;
};

type GraphRequest = {
  readonly method: "GET" | "POST";
  readonly accessToken: string;
  readonly parameters?: Record<string, string>;
};

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const createInstagramGraphClient = (options: {
  readonly configuration: InstagramGraphConfiguration;
  readonly fetchImplementation?: typeof fetch;
  readonly logger: Logger;
}) => {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const configuration = options.configuration;

  const send = async (
    path: string,
    request: GraphRequest,
  ): Promise<Record<string, unknown>> => {
    const url = new URL(
      `https://graph.facebook.com/${configuration.graphApiVersion}/${path.replace(/^\/+/u, "")}`,
    );
    const parameters = new URLSearchParams(request.parameters ?? {});
    let body: string | undefined;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${request.accessToken}`,
    };
    if (request.method === "GET") {
      for (const [key, value] of parameters) url.searchParams.set(key, value);
    } else {
      body = parameters.toString();
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    let response: Response;
    if (configuration.proxyUrl && configuration.proxyKey) {
      response = await fetchImplementation(configuration.proxyUrl, {
        body: JSON.stringify({
          url: url.toString(),
          method: request.method,
          headers,
          ...(body ? { body } : {}),
        }),
        headers: {
          Authorization: `Bearer ${configuration.proxyKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(60_000),
      });
    } else {
      response = await fetchImplementation(url, {
        ...(body ? { body } : {}),
        headers,
        method: request.method,
        signal: AbortSignal.timeout(30_000),
      });
    }

    const payload: unknown = await response.json().catch(() => null);
    const data = record(payload);
    const providerError = record(data?.error);
    if (!response.ok || providerError) {
      const providerCode =
        typeof providerError?.code === "number" ? providerError.code : null;
      const providerMessage =
        typeof providerError?.message === "string"
          ? providerError.message
          : null;
      options.logger.warn(
        {
          httpStatus: response.status,
          providerCode,
          stage: request.method === "GET" ? "read" : "write",
        },
        "Instagram Graph API request failed",
      );
      throw new MetaGraphRequestError(
        response.status,
        providerCode,
        providerMessage,
      );
    }
    if (!data)
      throw new Error("Instagram Graph API returned an invalid response");
    return data;
  };

  return {
    get: (
      path: string,
      accessToken: string,
      parameters?: Record<string, string>,
    ) => send(path, { method: "GET", accessToken, parameters }),
    post: (
      path: string,
      accessToken: string,
      parameters?: Record<string, string>,
    ) => send(path, { method: "POST", accessToken, parameters }),
  };
};

export type InstagramGraphClient = ReturnType<
  typeof createInstagramGraphClient
>;
