import { createHash } from "node:crypto";

export const hashGuestToken = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const readGuestToken = (request: {
  headers: { authorization?: string; cookie?: string };
}): string | null => {
  const cookie = request.headers.cookie?.split(";").map((item) => item.trim());
  const cookieToken = cookie
    ?.find((item) => item.startsWith("alsma_guest_session="))
    ?.split("=")[1];
  return (
    cookieToken ??
    (request.headers.authorization?.startsWith("Bearer ")
      ? request.headers.authorization.slice(7)
      : null)
  );
};
