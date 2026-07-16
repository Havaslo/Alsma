const GUEST_SESSION_KEY = "alsma-guest-session";

export const readGuestSession = (): string | null =>
  window.localStorage.getItem(GUEST_SESSION_KEY);

export const writeGuestSession = (token: string | null): void => {
  if (token) window.localStorage.setItem(GUEST_SESSION_KEY, token);
  else window.localStorage.removeItem(GUEST_SESSION_KEY);
};
