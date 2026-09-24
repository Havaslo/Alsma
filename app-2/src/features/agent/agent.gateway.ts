import type { Logger } from "pino";

type AgentGatewayOptions = {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly logger: Logger;
};
export type AgentGatewayInput = {
  readonly instructions: string;
  readonly input: string;
};

export const createAgentGatewayClient = (options: AgentGatewayOptions) => {
  const endpoint = `${(options.baseUrl ?? "").replace(/\/$/u, "")}/chat/completions`;

  const sanitizeLogMessage = (value: string) => {
    let sanitized = options.apiKey
      ? value.replaceAll(options.apiKey, "[REDACTED]")
      : value;
    return sanitized
      .replace(/Bearer\s+[^\s"'`]+/giu, "Bearer [REDACTED]")
      .replace(/sk-[A-Za-z0-9_-]+/giu, "[REDACTED]")
      .replace(/https?:\/\/[^\s"'`]+/giu, "[URL REDACTED]")
      .slice(0, 240);
  };

  const logFailure = async (response: Response) => {
    const body = await response.text().catch(() => "");
    let gatewayError: {
      code?: unknown;
      message?: unknown;
      type?: unknown;
    } | null = null;
    try {
      const payload = JSON.parse(body) as { error?: unknown };
      if (payload.error && typeof payload.error === "object")
        gatewayError = payload.error as {
          code?: unknown;
          message?: unknown;
          type?: unknown;
        };
    } catch {
      gatewayError = null;
    }
    options.logger.warn(
      {
        gatewayErrorCode:
          typeof gatewayError?.code === "string"
            ? gatewayError.code
            : undefined,
        gatewayErrorMessage:
          typeof gatewayError?.message === "string"
            ? sanitizeLogMessage(gatewayError.message)
            : undefined,
        gatewayErrorType:
          typeof gatewayError?.type === "string"
            ? gatewayError.type
            : undefined,
        gatewayRequestId:
          response.headers.get("x-request-id") ??
          response.headers.get("openai-request-id") ??
          undefined,
        gatewayStatus: response.status,
        gatewayStatusText: response.statusText,
      },
      "AI Gateway request failed",
    );
  };

  return async ({ instructions, input }: AgentGatewayInput): Promise<string | null> => {
    if (!options.apiKey || !options.baseUrl) return null;
    const request = async (responseFormat?: { readonly type: "json_object" }) =>
      fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-6-luna",
          ...(responseFormat ? { response_format: responseFormat } : {}),
          messages: [
            { role: "system", content: instructions },
            { role: "user", content: input },
          ],
        }),
        signal: AbortSignal.timeout(20_000),
      });

    let response: Response;
    try {
      response = await request({ type: "json_object" });
      if (!response.ok) {
        await logFailure(response);
        response = await request();
      }
    } catch (error) {
      options.logger.warn(
        {
          error:
            error instanceof Error
              ? sanitizeLogMessage(error.message)
              : "Unknown error",
        },
        "AI Gateway request could not be completed",
      );
      return null;
    }
    if (!response.ok) {
      await logFailure(response);
      return null;
    }
    const payload = (await response.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string } }>;
    } | null;
    return payload?.choices?.[0]?.message?.content?.trim() ?? null;
  };
};
