import { createHash } from "node:crypto";

const mangoRecordingQueryPath = "/vpbx/queries/recording/post";
const mangoHost = "app.mango-office.ru";
const maxRecordingBytes = 100 * 1024 * 1024;

const signRequest = (apiKey: string, json: string, salt: string) =>
  createHash("sha256").update(`${apiKey}${json}${salt}`).digest("hex");

const safeRedirect = (value: unknown): URL => {
  if (typeof value !== "string")
    throw new Error("Mango returned no recording URL");
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".mango-office.ru"))
    throw new Error("Mango returned an unsafe recording URL");
  return url;
};

const readRecordingUrl = (value: unknown): URL => {
  if (!value || typeof value !== "object")
    throw new Error("Invalid Mango recording response");
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
  const response = await fetchImpl(
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
  if (response.status < 300 || response.status >= 400)
    if (!response.ok)
      throw new Error(
        `Mango recording request failed with status ${response.status}`,
      );
  const location = response.headers.get("location");
  const redirect = location
    ? safeRedirect(location)
    : readRecordingUrl(await response.json());
  const recording = await fetchImpl(redirect, {
    signal: AbortSignal.timeout(30_000),
    redirect: "follow",
  });
  if (!recording.ok)
    throw new Error(
      `Mango recording download failed with status ${recording.status}`,
    );
  const length = Number(recording.headers.get("content-length") ?? "0");
  if (length > maxRecordingBytes)
    throw new Error("Mango recording exceeds the size limit");
  return recording;
};
