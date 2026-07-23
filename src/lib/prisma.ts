import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // In serverless (Vercel), each function has its own connection; PgBouncer
    // handles pooling externally. Set connection_limit=1 in DATABASE_URL.
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
