import { createHash, randomBytes, randomInt } from "node:crypto";

import { HttpError } from "../../lib/http/http-error.js";
import type { GuestAuthRepository } from "./guest-auth.repository.js";
import type {
  CompleteProfileBody,
  RequestCodeBody,
  VerifyCodeBody,
} from "./guest-auth.schemas.js";

const hash = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
const publicUser = (user: {
  email: string | null;
  fullName: string | null;
  id: string;
  phone: string;
}) => ({
  email: user.email,
  fullName: user.fullName,
  id: user.id,
  phone: user.phone,
  requiresNameCompletion: !user.fullName,
});

const normalizePhone = (value: string): string => {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8"))
    digits = `7${digits.slice(1)}`;
  if (digits.length !== 11 || !digits.startsWith("7")) {
    throw new HttpError(
      400,
      "PHONE_INVALID",
      "Введите корректный номер телефона.",
    );
  }
  return `+${digits}`;
};

export const createGuestAuthService = (repository: GuestAuthRepository) => ({
  completeProfile: async (token: string, input: CompleteProfileBody) => {
    const session = await repository.findSession(hash(token));
    if (!session?.user)
      throw new HttpError(401, "SESSION_INVALID", "Сессия недействительна.");
    return publicUser(
      await repository.completeProfile(session.user.id, input.fullName),
    );
  },
  me: async (token: string | null) => {
    if (!token) return { authenticated: false, guest: null };
    const session = await repository.findSession(hash(token));
    return session?.user
      ? { authenticated: true, guest: publicUser(session.user) }
      : { authenticated: false, guest: null };
  },
  requestCode: async (input: RequestCodeBody) => {
    const email =
      input.channel === "email"
        ? input.contact.trim().toLowerCase()
        : undefined;
    const phone =
      input.channel === "phone"
        ? normalizePhone(input.contact)
        : `email:${email}`;
    let user = email
      ? await repository.findUserByEmail(email)
      : await repository.findUserByPhone(phone);
    user ??= await repository.createUser({ email, phone });
    const code = String(randomInt(0, 10_000)).padStart(4, "0");
    const record = await repository.createCode({
      codeHash: hash(code),
      expiresAt: new Date(Date.now() + 10 * 60_000),
      phone: user.phone,
      userId: user.id,
    });
    const maskedContact = email
      ? `${email.slice(0, 2)}•••@${email.split("@")[1]}`
      : `${phone.slice(0, 2)} ••• ••• ${phone.slice(-2)}`;
    return {
      channel: input.channel,
      debugCode: code,
      expiresInSeconds: 600,
      maskedContact,
      pendingCodeId: record.id,
    };
  },
  verifyCode: async (input: VerifyCodeBody) => {
    const record = await repository.findCode(input.pendingCodeId);
    if (
      !record ||
      record.consumedAt ||
      record.expiresAt <= new Date() ||
      record.codeHash !== hash(input.code)
    ) {
      throw new HttpError(400, "CODE_INVALID", "Код недействителен или истёк.");
    }
    const token = randomBytes(32).toString("base64url");
    await repository.consumeCode(
      record.id,
      hash(token),
      new Date(Date.now() + 30 * 24 * 60 * 60_000),
    );
    const session = await repository.findSession(hash(token));
    if (!session?.user)
      throw new HttpError(
        500,
        "SESSION_CREATE_FAILED",
        "Не удалось создать сессию.",
      );
    return { authenticated: true, guest: publicUser(session.user), token };
  },
});

export type GuestAuthService = ReturnType<typeof createGuestAuthService>;
