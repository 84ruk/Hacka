import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MailService } from '../../src/mail/mail.service';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import {
  truncateUsers,
  createUserInDb,
  loginUser,
  assertNoSensitiveFields,
} from './test-utils';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';

/** MailService mock que guarda el último link para extraer token en tests */
class MailServiceCapture extends MailService {
  lastEmail: string | null = null;
  lastLink: string | null = null;

  override async sendPasswordReset(email: string, link: string): Promise<void> {
    this.lastEmail = email;
    this.lastLink = link;
  }

  getTokenFromLastLink(): string | null {
    if (!this.lastLink) return null;
    const match = /[?&]token=([^&]+)/.exec(this.lastLink);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

describe('Forgot / Reset Password (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailCapture: MailServiceCapture;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useClass(MailServiceCapture)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    mailCapture = app.get(MailService) as MailServiceCapture;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateUsers(prisma);
    mailCapture.lastEmail = null;
    mailCapture.lastLink = null;
  });

  describe('POST /auth/forgot-password', () => {
    it('con email existente retorna 200 (neutral)', async () => {
      await createUserInDb(prisma, {
        email: 'exist@test.com',
        password: 'Pass123!',
        role: Role.USER,
      });

      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'exist@test.com' })
        .expect(200);

      expect(res.body.message).toBeDefined();
      assertNoSensitiveFields(res.body);
    });

    it('con email NO existente retorna 200 (neutral)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'noexist@test.com' })
        .expect(200);

      expect(res.body.message).toBeDefined();
      assertNoSensitiveFields(res.body);
    });

    it('si usuario existe ACTIVE, en DB se setean resetTokenHash y resetTokenExpiresAt', async () => {
      const { id } = await createUserInDb(prisma, {
        email: 'active@test.com',
        password: 'Pass123!',
        role: Role.USER,
      });

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'active@test.com' })
        .expect(200);

      const user = await prisma.user.findUnique({ where: { id } });
      expect(user?.resetTokenHash).toBeDefined();
      expect(user?.resetTokenExpiresAt).toBeDefined();
      expect(user!.resetTokenExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('POST /auth/reset-password', () => {
    it('con token inválido → 400, mensaje neutro', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'NewPass123!' })
        .expect(400);

      expect(res.body.message).toBeDefined();
      assertNoSensitiveFields(res.body);
    });

    it('con token expirado → 400', async () => {
      const { id } = await createUserInDb(prisma, {
        email: 'expired@test.com',
        password: 'Pass123!',
        role: Role.USER,
      });
      const expiredToken = `${id}:${Buffer.from('expired').toString('hex')}`;
      const resetTokenHash = await argon2.hash(expiredToken);
      await prisma.user.update({
        where: { id },
        data: {
          resetTokenHash,
          resetTokenExpiresAt: new Date(Date.now() - 3600000),
        },
      });

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: expiredToken, newPassword: 'NewPass123!' })
        .expect(400);
    });

    it('con token válido → 200', async () => {
      await createUserInDb(prisma, {
        email: 'valid@test.com',
        password: 'OldPass123!',
        role: Role.USER,
      });

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'valid@test.com' })
        .expect(200);

      const token = mailCapture.getTokenFromLastLink();
      expect(token).not.toBeNull();

      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: token!, newPassword: 'NewPass123!' })
        .expect(200);

      expect(res.body.message).toBeDefined();
      assertNoSensitiveFields(res.body);
    });

    it('después del reset: refresh anterior falla (401)', async () => {
      await createUserInDb(prisma, {
        email: 'refresh-inval@test.com',
        password: 'OldPass123!',
        role: Role.USER,
      });

      const { refreshToken: oldRefreshToken } = await loginUser(
        app.getHttpServer(),
        'refresh-inval@test.com',
        'OldPass123!',
      );

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'refresh-inval@test.com' })
        .expect(200);

      const token = mailCapture.getTokenFromLastLink();
      expect(token).not.toBeNull();

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: token!, newPassword: 'NewPass123!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });

    it('después del reset: login con nueva contraseña funciona', async () => {
      await createUserInDb(prisma, {
        email: 'login-after@test.com',
        password: 'OldPass123!',
        role: Role.USER,
      });

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'login-after@test.com' })
        .expect(200);

      const token = mailCapture.getTokenFromLastLink();
      expect(token).not.toBeNull();

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: token!, newPassword: 'NewPass123!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login-after@test.com', password: 'NewPass123!' })
        .expect(201);
    });
  });
});
