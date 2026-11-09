// This is browser-assisted reauthorization, not refresh-token renewal.
// Persist only control flags: OAuth codes and credentials never enter storage here.
export const renewalWindowMs = 20 * 60_000;
export const renewalStorageKey = "alsma-vk-browser-renewal-v1";

export type BrowserRenewal = {
  enabled: boolean;
  verified: boolean;
  pendingAt: number | null;
  attemptedExpiry: string | null;
};

export const disabledRenewal = (): BrowserRenewal => ({
  enabled: false,
  verified: false,
  pendingAt: null,
  attemptedExpiry: null,
});

export function restoreRenewal(
  raw: string | null,
  outcome: string | null,
  now: number,
): BrowserRenewal {
  try {
    const value = JSON.parse(raw ?? "null") as BrowserRenewal | null;
    if (
      !value ||
      typeof value.enabled !== "boolean" ||
      typeof value.verified !== "boolean" ||
      !(value.pendingAt === null || typeof value.pendingAt === "number") ||
      !(
        value.attemptedExpiry === null ||
        typeof value.attemptedExpiry === "string"
      )
    )
      return disabledRenewal();
    if (value.pendingAt !== null) {
      // A return through blank.html or browser Back is not a successful callback.
      if (
        outcome !== "CONNECTED" ||
        now < value.pendingAt ||
        now - value.pendingAt > 600_000
      )
        return disabledRenewal();
      return { ...value, verified: true, pendingAt: null };
    }
    return value;
  } catch {
    return disabledRenewal();
  }
}

export function shouldRenew(
  state: BrowserRenewal,
  status: {
    configured: boolean;
    expiresAt: string | null;
    vkId?: { autoRenewal: boolean };
  },
  now: number,
): boolean {
  if (
    !state.enabled ||
    !state.verified ||
    state.pendingAt !== null ||
    !status.configured ||
    status.vkId?.autoRenewal ||
    !status.expiresAt ||
    state.attemptedExpiry === status.expiresAt
  )
    return false;
  const expiry = Date.parse(status.expiresAt);
  return Number.isFinite(expiry) && expiry - now <= renewalWindowMs;
}
