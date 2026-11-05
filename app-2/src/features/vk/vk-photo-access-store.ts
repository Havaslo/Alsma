const tokenTtlMs = 60 * 60_000;

type Entry = { token: string; expiresAt: number };

// Runtime-only, never stored in the shared production database or project variables.
export const createVkPhotoAccessStore = (now: () => number = Date.now) => {
  const entries = new Map<string, Entry>();
  const cleanup = () => {
    for (const [adminId, entry] of entries)
      if (entry.expiresAt <= now()) entries.delete(adminId);
  };
  return {
    set(adminId: string, token: string) {
      cleanup();
      const entry: Entry = { token, expiresAt: now() + tokenTtlMs };
      entries.set(adminId, entry);
      const timer = setTimeout(() => {
        if (entries.get(adminId) === entry) entries.delete(adminId);
      }, tokenTtlMs);
      timer.unref();
    },
    get(adminId: string) {
      cleanup();
      return entries.get(adminId)?.token;
    },
    clear(adminId: string) {
      entries.delete(adminId);
    },
  };
};
