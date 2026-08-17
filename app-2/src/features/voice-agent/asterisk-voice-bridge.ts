import { randomUUID } from "node:crypto";
import type { Logger } from "pino";

type BridgeOptions = {
  readonly baseUrl?: string;
  readonly username?: string;
  readonly password?: string;
  readonly app?: string;
  readonly aiSipEndpoint?: string;
  readonly logger: Logger;
  readonly onIncoming: (input: {
    channelId: string;
    callerPhone?: string;
    recordingName: string;
  }) => Promise<void>;
};

const normalize = (value: string) => value.replace(/\/$/u, "");

export const startAsteriskVoiceBridge = (options: BridgeOptions) => {
  const { baseUrl, username, password, app, aiSipEndpoint, logger } = options;
  if (!baseUrl || !username || !password || !app) {
    logger.warn("Asterisk voice bridge is not configured");
    return () => undefined;
  }
  const root = normalize(baseUrl);
  const auth = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  let socket: WebSocket | undefined;
  let stopped = false;
  let reconnectTimer: NodeJS.Timeout | undefined;
  const request = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${root}${path}`, {
      ...init,
      headers: { Authorization: auth, ...init.headers },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`ARI request failed: ${response.status}`);
  };
  const connect = () => {
    if (stopped) return;
    const wsUrl = `${root.replace(/^http/u, "ws")}/events?app=${encodeURIComponent(app)}`;
    socket = new WebSocket(wsUrl, {
      headers: { Authorization: auth },
    } as never);
    socket.addEventListener("open", () =>
      logger.info("Asterisk ARI bridge connected"),
    );
    socket.addEventListener("message", (event) => {
      void (async () => {
        const payload = JSON.parse(String(event.data)) as {
          type?: string;
          channel?: { id?: string; caller?: { number?: string } };
        };
        if (payload.type !== "StasisStart" || !payload.channel?.id) return;
        const channelId = payload.channel.id;
        const recordingName = `voice-${channelId}-${randomUUID()}`;
        await request(`/channels/${encodeURIComponent(channelId)}/answer`, {
          method: "POST",
        });
        await request(`/channels/${encodeURIComponent(channelId)}/record`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: recordingName,
            format: "wav",
            ifExists: "overwrite",
          }),
        });
        await options.onIncoming({
          channelId,
          callerPhone: payload.channel.caller?.number,
          recordingName,
        });
        if (!aiSipEndpoint) return;
        const bridge = `voice-${channelId}`;
        await request(`/bridges/${encodeURIComponent(bridge)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "mixing", name: bridge }),
        }).catch(() => undefined);
        await request(
          `/bridges/${encodeURIComponent(bridge)}/addChannel?channel=${encodeURIComponent(channelId)}`,
          { method: "POST" },
        );
        await request("/channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: aiSipEndpoint,
            app,
            appArgs: `voice:${channelId}`,
            callerId: payload.channel.caller?.number ?? "ALSMA",
          }),
        });
      })().catch((error) =>
        logger.warn(
          {
            error: error instanceof Error ? error.message : "ARI event failed",
          },
          "Asterisk voice event failed",
        ),
      );
    });
    socket.addEventListener("close", () => {
      if (!stopped) reconnectTimer = setTimeout(connect, 2_000);
    });
    socket.addEventListener("error", () => socket?.close());
  };
  connect();
  return () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
  };
};
