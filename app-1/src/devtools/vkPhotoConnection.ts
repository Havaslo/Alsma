import type bridge from "@vkontakte/vk-bridge";

import { apiUrl } from "../lib/api/api-base-url";

type Bridge = typeof bridge;
export async function connectVkPhotoTest(code: string, vkBridge: Bridge) {
  const auth = await vkBridge.send("VKWebAppGetAuthToken", {
    app_id: 54873380,
    scope: "photos",
  });
  if (!auth.access_token) throw new Error("ACCESS_NOT_GRANTED");
  const response = await fetch(apiUrl("/api/vk-factory-test/connect"), {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, token: auth.access_token }),
    redirect: "error",
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
      code?: number;
    } | null;
    if (data?.error === "VK_ACCESS_DENIED")
      throw new Error(
        typeof data.code === "number"
          ? `VK_ACCESS_DENIED_${data.code}`
          : "VK_ACCESS_DENIED",
      );
    if (data?.error === "PAIR_EXPIRED") throw new Error("PAIR_EXPIRED");
    throw new Error("CONNECTION_FAILED");
  }
}
