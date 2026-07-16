import { createHash, randomBytes } from "node:crypto";

import { HttpError } from "../../lib/http/http-error.js";
import type { AdminAuthRepository } from "./admin-auth.repository.js";
import type {
  AdminCredentials,
  InitializeAdminBody,
} from "./admin-auth.schemas.js";
import { hashPassword, verifyPassword } from "./password.js";

const tokenHash = (token: string): string =>
  createHash("sha256").update(token).digest("hex");
const publicUser = (user: {
  displayName: string;
  email: string;
  id: string;
  role: { name: string; permissions: string[] } | null;
}) => ({
  displayName: user.displayName,
  email: user.email,
  id: user.id,
  permissions: user.role?.permissions ?? [],
  role: user.role?.name ?? "Administrator",
});

export const createAdminAuthService = (repository: AdminAuthRepository) => {
  const createLogin = async (
    user: Awaited<ReturnType<AdminAuthRepository["findUserByEmail"]>>,
  ) => {
    if (!user)
      throw new HttpError(
        401,
        "ADMIN_LOGIN_INVALID",
        "Неверная почта или пароль.",
      );
    const token = randomBytes(32).toString("base64url");
    await repository.createSession({
      expiresAt: new Date(Date.now() + 12 * 60 * 60_000),
      tokenHash: tokenHash(token),
      userId: user.id,
    });
    return { token, user: publicUser(user) };
  };
  return {
    initialize: async (input: InitializeAdminBody) => {
      if ((await repository.countUsers()) > 0)
        throw new HttpError(
          409,
          "ADMIN_ALREADY_INITIALIZED",
          "Администратор уже создан.",
        );
      return createLogin(
        await repository.createUser({
          displayName: input.displayName,
          email: input.email,
          passwordHash: await hashPassword(input.password),
        }),
      );
    },
    login: async (input: AdminCredentials) => {
      const user = await repository.findUserByEmail(input.email);
      if (!user || !(await verifyPassword(input.password, user.passwordHash)))
        throw new HttpError(
          401,
          "ADMIN_LOGIN_INVALID",
          "Неверная почта или пароль.",
        );
      return createLogin(user);
    },
    me: async (token: string) => {
      const session = await repository.findSession(tokenHash(token));
      if (!session)
        throw new HttpError(
          401,
          "ADMIN_SESSION_INVALID",
          "Сессия администратора недействительна.",
        );
      return publicUser(session.user);
    },
    status: async () => ({ initialized: (await repository.countUsers()) > 0 }),
  };
};

export type AdminAuthService = ReturnType<typeof createAdminAuthService>;
