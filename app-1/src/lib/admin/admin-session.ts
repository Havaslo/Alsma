const ADMIN_SESSION_KEY = "alsma-admin-session";

export const readAdminSession = (): string | null => null;
export const writeAdminSession = (token: string | null): void => {
  void token;
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
};
