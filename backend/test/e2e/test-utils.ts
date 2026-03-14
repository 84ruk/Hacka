import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import cookieParser from 'cookie-parser';

export async function createE2eApp(appModule: unknown): Promise<INestApplication> {
  const { Test } = await import('@nestjs/testing');
  const moduleFixture = await Test.createTestingModule({
    imports: [appModule as any],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

export async function truncateUsers(prisma: PrismaService): Promise<void> {
  await prisma.user.deleteMany({});
}

export async function createUserInDb(
  prisma: PrismaService,
  data: { email: string; password: string; role: Role; firstName?: string; lastName?: string },
): Promise<{ id: string; email: string; role: Role }> {
  const passwordHash = await argon2.hash(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      role: data.role,
      status: UserStatus.ACTIVE,
    },
  });
  return { id: user.id, email: user.email, role: user.role };
}

export async function loginUser(
  server: any,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: any }> {
  const res = await request(server)
    .post('/auth/login')
    .send({ email, password })
    .expect(201);
  return {
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
    user: res.body.user,
  };
}

export function extractCookie(setCookies: string[] | undefined, name: string): string | null {
  if (!setCookies) return null;
  const match = setCookies.find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return match.split(';')[0] ?? null;
}

export function buildCookieHeader(cookies: Array<string | null>): string {
  return cookies.filter(Boolean).join('; ');
}

export async function loginWithCookies(
  server: any,
  email: string,
  password: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: any;
  cookieHeader: string;
  csrfToken: string;
}> {
  const res = await request(server)
    .post('/auth/login')
    .send({ email, password })
    .expect(201);
  const setCookies = res.headers['set-cookie'] as string[] | undefined;
  const accessCookie = extractCookie(setCookies, 'auth_access_token');
  const refreshCookie = extractCookie(setCookies, 'auth_refresh_token');
  const csrfCookie = extractCookie(setCookies, 'auth_csrf_token');
  if (!csrfCookie) {
    throw new Error('auth_csrf_token cookie missing in login response');
  }
  return {
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
    user: res.body.user,
    cookieHeader: buildCookieHeader([accessCookie, refreshCookie, csrfCookie]),
    csrfToken: csrfCookie.split('=')[1] ?? '',
  };
}

const SENSITIVE_KEYS = [
  'passwordHash',
  'refreshTokenHash',
  'resetTokenHash',
  'resetTokenExpiresAt',
];

export function assertNoSensitiveFields(obj: any): void {
  if (!obj || typeof obj !== 'object') return;
  const keys = Object.keys(obj);
  for (const key of keys) {
    if (SENSITIVE_KEYS.includes(key)) {
      throw new Error(`Response must not contain sensitive field: ${key}`);
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      assertNoSensitiveFields(obj[key]);
    }
  }
}
