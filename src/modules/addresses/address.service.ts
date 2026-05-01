import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/api-error.js";

type CreateAddressInput = {
  label: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  district: string;
  line1: string;
  line2?: string;
  postalCode: string;
  isDefault?: boolean;
};

type UpdateAddressInput = Partial<CreateAddressInput>;

export const createAddress = async (userId: string, payload: CreateAddressInput) => {
  return prisma.$transaction(async (tx) => {
    if (payload.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const hasAny = await tx.address.count({ where: { userId } });
    return tx.address.create({
      data: {
        ...payload,
        isDefault: payload.isDefault ?? hasAny === 0,
        userId,
      },
    });
  });
};

export const listMyAddresses = async (userId: string) => {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
};

export const updateAddress = async (userId: string, id: string, payload: UpdateAddressInput) => {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new ApiError(404, "Adres bulunamadi");
  }

  return prisma.$transaction(async (tx) => {
    if (payload.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id },
      data: payload,
    });
  });
};

export const deleteAddress = async (userId: string, id: string) => {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new ApiError(404, "Adres bulunamadi");
  }

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    if (existing.isDefault) {
      const latest = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      if (latest) {
        await tx.address.update({
          where: { id: latest.id },
          data: { isDefault: true },
        });
      }
    }
  });
};
