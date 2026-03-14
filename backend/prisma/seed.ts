if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Create backend/.env from .env.example.');
  process.exit(1);
}

import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const SUPERADMIN_EMAIL = 'superadmin@example.com';
const SUPERADMIN_PASSWORD = 'SuperAdmin123!';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';

async function main() {
  const created: string[] = [];

  // 1. Superadmin (máximos privilegios)
  let existing = await prisma.user.findUnique({
    where: { email: SUPERADMIN_EMAIL },
  });
  if (!existing) {
    const passwordHash = await argon2.hash(SUPERADMIN_PASSWORD);
    await prisma.user.create({
      data: {
        email: SUPERADMIN_EMAIL,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: Role.SUPERADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    created.push(SUPERADMIN_EMAIL);
  }

  // 2. Admin (gestión de usuarios)
  existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });
  if (!existing) {
    const passwordHash = await argon2.hash(ADMIN_PASSWORD);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        firstName: 'Admin',
        lastName: 'System',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    created.push(ADMIN_EMAIL);
  }

  if (created.length === 0) {
    console.log('Seed: superadmin and admin users already exist.');
    return;
  }
  console.log('Seed completed. Created:', created.join(', '));
  console.log('  Superadmin:', SUPERADMIN_EMAIL, '| Admin:', ADMIN_EMAIL);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
