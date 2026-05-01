import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { Role } from "../../lib/roles.js";
import type { Role as AppRole } from "../../lib/roles.js";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/api-error.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/token.js";

type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  storeName?: string;
  taxNumber?: string;
};

type LoginInput = {
  email: string;
  password: string;
};
type SessionMeta = { ipAddress?: string; userAgent?: string };

const BCRYPT_ROUNDS = 12;

/** Calinan veya yeniden kullanilan refresh token tespitinde tum cihaz oturumlarini kapatir */
export const revokeAllRefreshSessionsForUser = async (userId: string) => {
  await prisma.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

const buildAuthResponse = async (
  user: { id: string; role: AppRole; email: string; firstName: string; lastName: string },
  meta?: SessionMeta,
) => {
  const session = await prisma.refreshSession.create({
    data: {
      tokenHash: "",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      userId: user.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    },
  });

  const refreshToken = signRefreshToken({ sid: session.id, userId: user.id });
  await prisma.refreshSession.update({
    where: { id: session.id },
    data: { tokenHash: hashToken(refreshToken) },
  });

  return {
    accessToken: signAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    }),
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };
};

export const register = async (payload: RegisterInput, meta?: SessionMeta) => {
  const existing = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (existing) {
    throw new ApiError(409, "Bu e-posta zaten kayitli");
  }

  const passwordHash = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        passwordHash,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
        wallet: { create: { balance: 0 } },
        ...(payload.role === Role.SELLER
          ? {
              store: {
                create: {
                  storeName: payload.storeName!,
                  taxNumber: payload.taxNumber,
                },
              },
            }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : String(error.meta?.target ?? "");
      const combined = `${target} ${error.message}`;
      if (combined.includes("storeName")) {
        throw new ApiError(409, "Bu magaza adi zaten kullaniliyor");
      }
      if (combined.includes("email")) {
        throw new ApiError(409, "Bu e-posta zaten kayitli");
      }
      throw new ApiError(409, "Kayit icin benzersiz alan cakisiyor");
    }
    throw error;
  }

  return buildAuthResponse(user, meta);
};

export const login = async (payload: LoginInput, meta?: SessionMeta) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (!user) {
    throw new ApiError(401, "E-posta veya sifre hatali");
  }

  const valid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "E-posta veya sifre hatali");
  }

  return buildAuthResponse(user, meta);
};

export const refresh = async (token: string, meta?: SessionMeta) => {
  let payload: { sid: string; userId: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, "Gecersiz refresh token");
  }

  const session = await prisma.refreshSession.findUnique({
    where: { id: payload.sid },
    include: { user: true },
  });

  if (!session || session.userId !== payload.userId) {
    throw new ApiError(401, "Refresh session bulunamadi");
  }

  const tokenHash = hashToken(token);

  // Rotasyon sonrasi eski token ile tekrar deneme = yeniden kullanim; tum oturumlari kapat
  if (session.revokedAt) {
    await revokeAllRefreshSessionsForUser(session.userId);
    throw new ApiError(
      401,
      "Refresh token yeniden kullanimi tespit edildi; tum cihazlardan cikis yapildi",
    );
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(401, "Refresh session suresi doldu");
  }

  if (session.tokenHash !== tokenHash) {
    await revokeAllRefreshSessionsForUser(session.userId);
    throw new ApiError(
      401,
      "Refresh token dogrulanamadi; guvenlik nedeniyle tum oturumlar kapatildi",
    );
  }

  const nextSession = await prisma.refreshSession.create({
    data: {
      tokenHash: "",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      userId: session.userId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    },
  });
  const nextRefreshToken = signRefreshToken({
    sid: nextSession.id,
    userId: session.userId,
  });
  await prisma.$transaction([
    prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), replacedById: nextSession.id },
    }),
    prisma.refreshSession.update({
      where: { id: nextSession.id },
      data: { tokenHash: hashToken(nextRefreshToken) },
    }),
  ]);

  return {
    accessToken: signAccessToken({
      userId: session.user.id,
      role: session.user.role,
      email: session.user.email,
    }),
    refreshToken: nextRefreshToken,
    user: {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      role: session.user.role,
    },
  };
};

export const logout = async (token: string) => {
  try {
    const payload = verifyRefreshToken(token);
    await prisma.refreshSession.updateMany({
      where: { id: payload.sid, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    return;
  }
};

export const logoutAllDevices = async (userId: string) => {
  await revokeAllRefreshSessionsForUser(userId);
};

export const me = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      store: true,
      wallet: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "Kullanici bulunamadi");
  }

  return user;
};
