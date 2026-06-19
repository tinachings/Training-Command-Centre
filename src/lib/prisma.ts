import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;

const adapter = new PrismaPg({
  connectionString,
});

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    adapter,
  });
}

function hasPeopleDelegates(client: PrismaClient) {
  const candidate = client as PrismaClient & {
    person?: unknown;
    role?: unknown;
    personRole?: unknown;
  };

  return Boolean(candidate.person && candidate.role && candidate.personRole);
}

if (globalForPrisma.prisma && !hasPeopleDelegates(globalForPrisma.prisma)) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
