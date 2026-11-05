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
  const active = new Map<string, Pair>();
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
      active.delete(adminId);
      tokens.delete(adminId);
      if (pairs.size >= maximumPending) return null;
      const code = randomBytes(32).toString("hex");
      const hash = hashCode(code);
      const pair: Pair = { adminId, expiresAt: now() + pairingMs };
      pairs.set(hash, pair);
      active.set(adminId, pair);
      const timer = setTimeout(() => {
        if (pairs.get(hash) === pair) pairs.delete(hash);
        if (active.get(adminId) === pair) active.delete(adminId);
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
    set(pair: Pair, token: string) {
      // Disconnect or a newer pairing invalidates a check already in flight.
      const { adminId, expiresAt } = pair;
      if (expiresAt <= now() || active.get(adminId) !== pair) return false;
      active.delete(adminId);
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
      active.delete(adminId);
      tokens.delete(adminId);
      for (const [key, pair] of pairs)
        if (pair.adminId === adminId) pairs.delete(key);
    },
  };
};
