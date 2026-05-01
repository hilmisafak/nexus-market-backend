import type { Role } from "../lib/roles.js";

declare global {
  namespace Express {
    interface UserPayload {
      userId: string;
      role: Role;
      email: string;
    }

    interface Request {
      user?: UserPayload;
      rawBody?: string;
    }
  }
}

export {};
