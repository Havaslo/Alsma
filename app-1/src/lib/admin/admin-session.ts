const ADMIN_SESSION_KEY = "alsma-admin-session";
let inMemoryAdminSession: string | null = null;

export const readAdminSession = (): string | null => {
  try {
    return (
      window.sessionStorage.getItem(ADMIN_SESSION_KEY) ?? inMemoryAdminSession
    );
  } catch {
    return inMemoryAdminSession;
  }
};

export const writeAdminSession = (token: string | null): void => {
  inMemoryAdminSession = token;
  try {
    if (token) window.sessionStorage.setItem(ADMIN_SESSION_KEY, token);
    else window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // The in-memory copy keeps the current tab usable when storage is restricted.
  }
  try {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // Older versions may have stored this key in localStorage.
  }
};
