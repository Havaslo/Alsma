import { createHash } from "node:crypto";

const mangoRecordingQueryPath = "/vpbx/queries/recording/post";
const mangoHost = "app.mango-office.ru";
const maxRecordingBytes = 100 * 1024 * 1024;

export class MangoRecordingError extends Error {
  readonly code: string;
  readonly detail?: string;

  constructor(code: string, detail?: string, cause?: unknown) {
    super(
      detail ? `Mango recording ${code}: ${detail}` : `Mango recording ${code}`,
      cause === undefined ? undefined : { cause },
    );
    this.name = "MangoRecordingError";
    this.code = code;
    this.detail = detail;
  }
}

const signRequest = (apiKey: string, json: string, salt: string) =>
  createHash("sha256").update(`${apiKey}${json}${salt}`).digest("hex");

const describeFetchError = (error: unknown): string => {
  if (!(error instanceof Error)) return "unknown error";
  const cause = error.cause instanceof Error ? error.cause : undefined;
  const causeCode =
    cause && "code" in cause && typeof cause.code === "string"
      ? cause.code
      : undefined;
  return [error.name, error.message, causeCode, cause?.message]
    .filter(
      (part, index, parts) => Boolean(part) && parts.indexOf(part) === index,
    )
    .join(": ")
    .slice(0, 240);
};

const readErrorBody = async (
  response: Response,
): Promise<string | undefined> => {
  try {
    const text = await response.text();
    const detail = text.replace(/[\p{Cc}\p{Cf}]+/gu, " ").trim();
    return detail ? detail.slice(0, 240) : undefined;
  } catch {
    return undefined;
  }
};

const safeRedirect = (value: unknown): URL => {
  if (typeof value !== "string")
    throw new MangoRecordingError("no_url", "Mango returned no recording URL");
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".mango-office.ru"))
    throw new MangoRecordingError(
      "unsafe_url",
      "Mango returned an unsafe recording URL",
    );
  return url;
};

const readRecordingUrl = (value: unknown): URL => {
  if (!value || typeof value !== "object")
    throw new MangoRecordingError(
      "invalid_response",
      "Invalid Mango recording response",
    );
  const body = value as Record<string, unknown>;
  const result =
    body.result && typeof body.result === "object"
      ? (body.result as Record<string, unknown>)
      : undefined;
  return safeRedirect(
    body.url ?? body.recording_url ?? body.link ?? result?.url ?? result?.link,
  );
};

export const fetchMangoRecording = async ({
  apiKey,
  recordingId,
  salt,
  fetchImpl = fetch,
}: {
  readonly apiKey: string;
  readonly recordingId: string;
  readonly salt: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<Response> => {
  const json = JSON.stringify({ recording_id: recordingId, action: "play" });
  let response: Response;
  try {
    response = await fetchImpl(
      `https://${mangoHost}${mangoRecordingQueryPath}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          vpbx_api_key: apiKey,
          sign: signRequest(apiKey, json, salt),
          json,
        }),
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch (error) {
    throw new MangoRecordingError(
      "request_failed",
      describeFetchError(error),
      error,
    );
  }
  if (response.status < 300 || response.status >= 400)
    if (!response.ok) {
      const body = await readErrorBody(response);
      throw new MangoRecordingError(
        `http_${response.status}`,
        body
          ? `Mango recording request failed with status ${response.status}: ${body}`
          : `Mango recording request failed with status ${response.status}`,
      );
    }
  const location = response.headers.get("location");
  let redirect: URL;
  if (location) redirect = safeRedirect(location);
  else {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new MangoRecordingError(
        "invalid_response",
        "Mango returned an invalid recording response",
        error,
      );
    }
    redirect = readRecordingUrl(payload);
  }
  let recording: Response;
  try {
    recording = await fetchImpl(redirect, {
      signal: AbortSignal.timeout(30_000),
      redirect: "follow",
    });
  } catch (error) {
    throw new MangoRecordingError(
      "download_failed",
      describeFetchError(error),
      error,
    );
  }
  if (!recording.ok) {
    const body = await readErrorBody(recording);
    throw new MangoRecordingError(
      `download_http_${recording.status}`,
      body
        ? `Mango recording download failed with status ${recording.status}: ${body}`
        : `Mango recording download failed with status ${recording.status}`,
    );
  }
  const length = Number(recording.headers.get("content-length") ?? "0");
  if (length > maxRecordingBytes)
    throw new MangoRecordingError(
      "size_limit",
      "Mango recording exceeds the size limit",
    );
  return recording;
};
