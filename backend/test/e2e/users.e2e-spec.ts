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

describe('Users + Roles (e2e)', () => {
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

  it('GET /users sin token → 401', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });

  it('GET /users con token USER → 403', async () => {
    await createUserInDb(prisma, {
      email: 'user@test.com',
      password: 'Pass123!',
      role: Role.USER,
    });
    const { accessToken } = await loginUser(app.getHttpServer(), 'user@test.com', 'Pass123!');

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('GET /users con token ADMIN → 200 y lista', async () => {
    await createUserInDb(prisma, {
      email: 'admin@test.com',
      password: 'Admin123!',
      role: Role.ADMIN,
    });
    const { accessToken } = await loginUser(app.getHttpServer(), 'admin@test.com', 'Admin123!');

    const res = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('total');
    assertNoSensitiveFields(res.body);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).not.toHaveProperty('passwordHash');
      expect(res.body.data[0]).not.toHaveProperty('refreshTokenHash');
      expect(res.body.data[0]).not.toHaveProperty('resetTokenHash');
      expect(res.body.data[0]).not.toHaveProperty('resetTokenExpiresAt');
    }
  });

  it('POST /users solo ADMIN → 201; USER → 403', async () => {
    await createUserInDb(prisma, {
      email: 'admin2@test.com',
      password: 'Admin123!',
      role: Role.ADMIN,
    });
    await createUserInDb(prisma, {
      email: 'plainuser@test.com',
      password: 'Pass123!',
      role: Role.USER,
    });

    const adminToken = (await loginUser(app.getHttpServer(), 'admin2@test.com', 'Admin123!'))
      .accessToken;
    const userToken = (await loginUser(app.getHttpServer(), 'plainuser@test.com', 'Pass123!'))
      .accessToken;

    const createBody = {
      email: 'newuser@test.com',
      password: 'NewPass123!',
      firstName: 'New',
      lastName: 'User',
    };

    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${userToken}`)
      .send(createBody)
      .expect(403);

    const res = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createBody)
      .expect(201);

    expect(res.body).toHaveProperty('email', 'newuser@test.com');
    expect(res.body).not.toHaveProperty('passwordHash');
    assertNoSensitiveFields(res.body);
  });

  it('POST /users con cookies requiere CSRF', async () => {
    await createUserInDb(prisma, {
      email: 'admin-cookie@test.com',
      password: 'Admin123!',
      role: Role.ADMIN,
    });

    const { cookieHeader, csrfToken } = await loginWithCookies(
      app.getHttpServer(),
      'admin-cookie@test.com',
      'Admin123!',
    );

    const createBody = {
      email: 'newcookie@test.com',
      password: 'NewPass123!',
      firstName: 'New',
      lastName: 'Cookie',
    };

    await request(app.getHttpServer())
      .post('/users')
      .set('Cookie', cookieHeader)
      .send(createBody)
      .expect(403);

    await request(app.getHttpServer())
      .post('/users')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', csrfToken)
      .send(createBody)
      .expect(201);
  });
});
