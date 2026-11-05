import { createHash, randomBytes } from "node:crypto";

const pairingMs = 5 * 60_000;
const tokenMs = 15 * 60_000;
const maximumPending = 20;

type Pair = { adminId: string; expiresAt: number };
type Credential = { token: string; expiresAt: number };
const hashCode = (value: string) =>
  createHash("sha256").update(value).digest("hex");

// Runtime-only, never stored in the shared production database or project variables.
export const createVkPhotoTestConnection = (now: () => number = Date.now) => {
  const pairs = new Map<string, Pair>();
  const tokens = new Map<string, Credential>();
  const cleanup = () => {
    for (const [key, value] of pairs)
      if (value.expiresAt <= now()) pairs.delete(key);
    for (const [key, value] of tokens)
      if (value.expiresAt <= now()) tokens.delete(key);
  };
  return {
    start(adminId: string) {
      cleanup();
      for (const [key, pair] of pairs)
        if (pair.adminId === adminId) pairs.delete(key);
      if (pairs.size >= maximumPending) return null;
      const code = randomBytes(32).toString("hex");
      const hash = hashCode(code);
      const pair: Pair = { adminId, expiresAt: now() + pairingMs };
      pairs.set(hash, pair);
      const timer = setTimeout(() => {
        if (pairs.get(hash) === pair) pairs.delete(hash);
      }, pairingMs);
      timer.unref();
      return code;
    },
    consume(code: string) {
      cleanup();
      const hash = hashCode(code);
      const pair = pairs.get(hash);
      if (!pair) return null;
      pairs.delete(hash);
      return pair;
    },
    set(adminId: string, token: string, pairExpiresAt: number) {
      // The one-time code must still be live after the VK check completes.
      if (pairExpiresAt <= now()) return false;
      const credential: Credential = { token, expiresAt: now() + tokenMs };
      tokens.set(adminId, credential);
      const timer = setTimeout(() => {
        if (tokens.get(adminId) === credential) tokens.delete(adminId);
      }, tokenMs);
      timer.unref();
      return true;
    },
    get(adminId: string) {
      cleanup();
      return tokens.get(adminId)?.token;
    },
    clear(adminId: string) {
      tokens.delete(adminId);
      for (const [key, pair] of pairs)
        if (pair.adminId === adminId) pairs.delete(key);
    },
  };
};
