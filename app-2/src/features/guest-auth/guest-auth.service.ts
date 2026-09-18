import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import { HttpError } from "../../lib/http/http-error.js";
import type { GuestAuthRepository } from "./guest-auth.repository.js";
import type {
  CompleteProfileBody,
  LoginBody,
  VerifyCodeBody,
} from "./guest-auth.schemas.js";
import { sendVerificationEmail } from "./mail.client.js";

const hash = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
const publicUser = (user: {
  bonusProgram: { balance: number; level: string } | null;
  bookings: Array<{
    checkInDate: Date;
    checkOutDate: Date;
    contactComment: string | null;
    contactEmail: string | null;
    contactFirstName: string | null;
    contactLastName: string | null;
    contactPhone: string | null;
    epteraReservationId: string | null;
    epteraPaymentSyncAttemptedAt: Date | null;
    epteraPaymentSyncStatus: string;
    epteraPaymentSyncedAt: Date | null;
    guestsCount: number;
    guestList: unknown;
    id: string;
    paymentStatus: string;
    paymentMethod: string;
    paymentAmount: { toString(): string } | null;
    roomName: string;
    selectedOffer: unknown;
    status: string;
    totalAmount: { toString(): string } | null;
    voucherNumber: string | null;
  }>;
  serviceOrders: Array<{
    id: string;
    status: string;
    total: { toString(): string };
    currency: string;
    createdAt: Date;
    items: Array<{
      quantity: number;
      service: { name: string };
      variant: { name: string };
      booking: { startsAt: Date; status: string } | null;
    }>;
  }>;
  email: string | null;
  fullName: string | null;
  id: string;
  phone: string;
}) => ({
  bonusProgram: user.bonusProgram,
  bookings: user.bookings.map((booking) => {
    const {
      epteraPaymentSyncAttemptedAt: _epteraPaymentSyncAttemptedAt,
      epteraPaymentSyncStatus: _epteraPaymentSyncStatus,
      epteraPaymentSyncedAt: _epteraPaymentSyncedAt,
      ...publicBooking
    } = booking;
    return {
      ...publicBooking,
      paymentAmount: booking.paymentAmount?.toString() ?? null,
      totalAmount: booking.totalAmount?.toString() ?? null,
    };
  }),
  serviceOrders: user.serviceOrders.map((order) => ({
    id: order.id,
    status: order.status,
    total: order.total.toString(),
    currency: order.currency,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      quantity: item.quantity,
      serviceName: item.service.name,
      variantName: item.variant.name,
      booking: item.booking
        ? { startsAt: item.booking.startsAt, status: item.booking.status }
        : null,
    })),
  })),
  email: user.email,
  fullName: user.fullName,
  id: user.id,
  phone: user.phone,
  requiresNameCompletion: !user.fullName,
});

export const createGuestAuthService = (
  repository: GuestAuthRepository,
  mailRu: { readonly email?: string; readonly password?: string },
) => ({
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
  requestCode: async (input: LoginBody) => {
    const email = input.email.trim().toLowerCase();
    if (!mailRu.email || !mailRu.password)
      throw new HttpError(
        503,
        "EMAIL_NOT_CONFIGURED",
        "Подтверждение по почте временно недоступно.",
      );
    const recent = await repository.findRecentVerification(email);
    if (recent && Date.now() - recent.lastSentAt.getTime() < 60_000)
      throw new HttpError(
        429,
        "CODE_RESEND_TOO_SOON",
        "Новый код можно запросить через минуту.",
      );
    const code = String(randomInt(0, 10_000)).padStart(4, "0");
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const verification = recent
      ? await repository.updateVerificationForResend(recent.id, {
          codeHash: hash(code),
          expiresAt,
        })
      : await repository.createVerification({
          codeHash: hash(code),
          email,
          expiresAt,
          messageId: randomUUID(),
        });
    try {
      await sendVerificationEmail(
        mailRu as { email: string; password: string },
        email,
        code,
        verification.messageId ?? verification.id,
      );
      const sent = await repository.markVerificationSent(verification.id);
      if (sent.count !== 1) throw new Error("Verification was already sent.");
    } catch {
      throw new HttpError(
        502,
        "EMAIL_SEND_FAILED",
        "Не удалось отправить код. Попробуйте ещё раз позже.",
      );
    }
    return { sent: true };
  },
  verifyCode: async (input: VerifyCodeBody) => {
    const email = input.email.trim().toLowerCase();
    const verification = await repository.findRecentVerification(email);
    if (
      !verification ||
      verification.expiresAt <= new Date() ||
      verification.attempts >= 5
    )
      throw new HttpError(401, "CODE_INVALID", "Код недействителен или истёк.");
    const attempt = await repository.incrementVerificationAttempts(
      verification.id,
    );
    if (attempt.count !== 1)
      throw new HttpError(401, "CODE_INVALID", "Код недействителен или истёк.");
    const expected = Buffer.from(verification.codeHash, "hex");
    const actual = Buffer.from(hash(input.code), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw new HttpError(401, "CODE_INVALID", "Код недействителен или истёк.");
    const consumed = await repository.consumeVerification(verification.id);
    if (consumed.count !== 1)
      throw new HttpError(401, "CODE_INVALID", "Код недействителен или истёк.");
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
