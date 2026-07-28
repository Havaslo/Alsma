const ADMIN_SESSION_KEY = "alsma-admin-session";

export const readAdminSession = (): string | null =>
  window.localStorage.getItem(ADMIN_SESSION_KEY);
export const writeAdminSession = (token: string | null): void => {
  if (token) window.localStorage.setItem(ADMIN_SESSION_KEY, token);
  else window.localStorage.removeItem(ADMIN_SESSION_KEY);
};
