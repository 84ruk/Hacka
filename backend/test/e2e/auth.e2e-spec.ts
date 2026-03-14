import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import request from 'supertest';
import {
  createE2eApp,
  truncateUsers,
  createUserInDb,
  loginUser,
  loginWithCookies,
  assertNoSensitiveFields,
} from './test-utils';
import { Role } from '@prisma/client';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createE2eApp(AppModule);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateUsers(prisma);
  });

  describe('POST /auth/register', () => {
    it('crea usuario USER y retorna tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'user@test.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('user@test.com');
      expect(res.body.user.role).toBe(Role.USER);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).not.toHaveProperty('passwordHash');
      const cookies = res.headers['set-cookie'] ?? [];
      const cookieStr = cookies.join(';');
      expect(cookieStr).toContain('auth_access_token=');
      expect(cookieStr).toContain('auth_refresh_token=');
      expect(cookieStr).toContain('auth_csrf_token=');
      assertNoSensitiveFields(res.body);
    });
  });

  describe('POST /auth/login', () => {
    it('con credenciales correctas retorna tokens', async () => {
      await createUserInDb(prisma, {
        email: 'login@test.com',
        password: 'Pass123!',
        role: Role.USER,
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@test.com', password: 'Pass123!' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('login@test.com');
      const cookies = res.headers['set-cookie'] ?? [];
      const cookieStr = cookies.join(';');
      expect(cookieStr).toContain('auth_access_token=');
      expect(cookieStr).toContain('auth_refresh_token=');
      expect(cookieStr).toContain('auth_csrf_token=');
      assertNoSensitiveFields(res.body);
    });

    it('con credenciales incorrectas retorna 401 y mensaje neutro', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: 'WrongPass' })
        .expect(401);

      expect(res.body.message).toBeDefined();
      expect(String(res.body.message).toLowerCase()).not.toContain('email');
      expect(String(res.body.message).toLowerCase()).not.toContain('exist');
    });
  });

  describe('GET /auth/me', () => {
    it('con accessToken válido retorna user', async () => {
      await createUserInDb(prisma, {
        email: 'me@test.com',
        password: 'Pass123!',
        role: Role.USER,
      });
      const { accessToken } = await loginUser(app.getHttpServer(), 'me@test.com', 'Pass123!');

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe('me@test.com');
      expect(res.body).not.toHaveProperty('passwordHash');
      assertNoSensitiveFields(res.body);
    });
  });

  describe('POST /auth/refresh', () => {
    it('con refresh válido retorna nuevos tokens', async () => {
      await createUserInDb(prisma, {
        email: 'refresh@test.com',
        password: 'Pass123!',
        role: Role.USER,
      });
      const { refreshToken } = await loginUser(app.getHttpServer(), 'refresh@test.com', 'Pass123!');

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      assertNoSensitiveFields(res.body);
    });

    it('con cookies + csrf retorna nuevos tokens y set-cookie', async () => {
      await createUserInDb(prisma, {
        email: 'refresh-cookie@test.com',
        password: 'Pass123!',
        role: Role.USER,
      });
      const { cookieHeader, csrfToken } = await loginWithCookies(
        app.getHttpServer(),
        'refresh-cookie@test.com',
        'Pass123!',
      );

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', csrfToken)
        .send({})
        .expect(201);

      const cookies = res.headers['set-cookie'] ?? [];
      const cookieStr = cookies.join(';');
      expect(cookieStr).toContain('auth_access_token=');
      expect(cookieStr).toContain('auth_refresh_token=');
      expect(cookieStr).toContain('auth_csrf_token=');
    });
  });

  describe('POST /auth/logout', () => {
    it('invalida refresh (refresh posterior falla)', async () => {
      await createUserInDb(prisma, {
        email: 'logout@test.com',
        password: 'Pass123!',
        role: Role.USER,
      });
      const { refreshToken } = await loginUser(app.getHttpServer(), 'logout@test.com', 'Pass123!');

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('con cookies + csrf limpia cookies', async () => {
      await createUserInDb(prisma, {
        email: 'logout-cookie@test.com',
        password: 'Pass123!',
        role: Role.USER,
      });
      const { cookieHeader, csrfToken } = await loginWithCookies(
        app.getHttpServer(),
        'logout-cookie@test.com',
        'Pass123!',
      );

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', csrfToken)
        .send({})
        .expect(201);

      const cookies = res.headers['set-cookie'] ?? [];
      const cookieStr = cookies.join(';');
      expect(cookieStr).toContain('auth_access_token=');
      expect(cookieStr).toContain('auth_refresh_token=');
      expect(cookieStr).toContain('auth_csrf_token=');
    });
  });
});
