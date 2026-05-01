import { ApiError } from "../../lib/api-error.js";
import { Role } from "../../lib/roles.js";

export type ManagedOrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
export type NextManagedStatus = "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";

type PolicyInput = {
  current: ManagedOrderStatus;
  next: NextManagedStatus;
  actorRole: Role;
  isBuyerOwner: boolean;
  canShipByOwnership: boolean;
};

export const assertOrderStatusTransition = ({
  current,
  next,
  actorRole,
  isBuyerOwner,
  canShipByOwnership,
}: PolicyInput) => {
  if (next === "SHIPPED") {
    if (!canShipByOwnership) throw new ApiError(403, "Siparisi kargoya cikarma yetkisi yok");
    if (current !== "PAID") throw new ApiError(400, "Sadece PAID siparis kargoya cikabilir");
    return;
  }

  if (next === "DELIVERED") {
    if (!(actorRole === Role.ADMIN || isBuyerOwner)) {
      throw new ApiError(403, "Teslim edildi guncelleme yetkisi yok");
    }
    if (current !== "SHIPPED") throw new ApiError(400, "Sadece SHIPPED siparis teslim edilebilir");
    return;
  }

  if (next === "CANCELLED") {
    if (!(actorRole === Role.ADMIN || (isBuyerOwner && current === "PENDING"))) {
      throw new ApiError(403, "Siparis iptal yetkisi yok");
    }
    if (!["PENDING", "PAID"].includes(current)) {
      throw new ApiError(400, "Bu durumdaki siparis iptal edilemez");
    }
    return;
  }

  if (next === "REFUNDED") {
    if (actorRole !== Role.ADMIN) throw new ApiError(403, "Sadece admin refund yapabilir");
    if (!["PAID", "SHIPPED", "DELIVERED"].includes(current)) {
      throw new ApiError(400, "Bu durumdaki siparis iade edilemez");
    }
  }
};
