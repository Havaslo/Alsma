import { createHash, randomBytes } from "node:crypto";

import { HttpError } from "../../lib/http/http-error.js";
import type { GuestAuthRepository } from "./guest-auth.repository.js";
import type { CompleteProfileBody, LoginBody } from "./guest-auth.schemas.js";

const hash = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
const publicUser = (user: {
  bonusProgram: { balance: number; level: string } | null;
  bookings: Array<{
    checkInDate: Date;
    checkOutDate: Date;
    guestsCount: number;
    id: string;
    roomName: string;
    status: string;
    totalAmount: { toString(): string } | null;
  }>;
  email: string | null;
  fullName: string | null;
  id: string;
  phone: string;
}) => ({
  bonusProgram: user.bonusProgram,
  bookings: user.bookings.map((booking) => ({
    ...booking,
    totalAmount: booking.totalAmount?.toString() ?? null,
  })),
  email: user.email,
  fullName: user.fullName,
  id: user.id,
  phone: user.phone,
  requiresNameCompletion: !user.fullName,
});

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
  logout: async (token: string | null) => {
    if (token) await repository.revokeSession(hash(token));
    return { ok: true };
  },
  login: async (input: LoginBody) => {
    const email = input.email.trim().toLowerCase();
    // GuestUser.phone remains required for compatibility with existing records;
    // email-only accounts use a non-contact technical value in that column.
    const technicalPhone = `email:${email}`;
    let user = await repository.findUserByEmail(email);
    user ??= await repository.findUserByPhone(technicalPhone);
    user ??= await repository.createUser({ email, phone: technicalPhone });
    user = (await repository.provisionDemoProfile(user.id)) ?? user;
    const token = randomBytes(32).toString("base64url");
    await repository.createSession({
      sessionHash: hash(token),
      sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
      phone: user.phone,
      userId: user.id,
    });
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
