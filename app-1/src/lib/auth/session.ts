const GUEST_SESSION_KEY = "alsma-guest-session";

export const readGuestSession = (): string | null => null;

export const writeGuestSession = (token: string | null): void => {
  void token;
  window.localStorage.removeItem(GUEST_SESSION_KEY);
};
