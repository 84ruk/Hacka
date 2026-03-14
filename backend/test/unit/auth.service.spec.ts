import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UsersService } from '../../src/users/users.service';
import { MailService } from '../../src/mail/mail.service';
import { UserStatus } from '@prisma/client';
import { UserResponse } from '../../src/users/users.service';

const mockUserResponse: UserResponse = {
  id: 'user-1',
  email: 'test@test.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER' as any,
  status: UserStatus.ACTIVE,
  tenantId: null,
  lastLoginAt: null,
  emailVerifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockUsersService = {
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(() => 'mock-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string | number> = {
        JWT_SECRET: 'test-secret',
        JWT_ACCESS_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
        RESET_TOKEN_EXPIRATION_MINUTES: 60,
        RESET_PASSWORD_BASE_URL: 'http://localhost:3000',
      };
      return map[key];
    }),
  };

  const mockMailService = {
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('lanza UnauthorizedException si credenciales incorrectas', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'u@test.com',
        passwordHash: 'hash',
        status: UserStatus.ACTIVE,
      });
      const argon2 = require('argon2');
      const verifySpy = jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(
        service.login({ email: 'u@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      verifySpy.mockRestore();
    });

    it('lanza ForbiddenException si usuario no ACTIVE', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'u@test.com',
        passwordHash: 'hash',
        status: UserStatus.INACTIVE,
      });
      const argon2 = require('argon2');
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);

      await expect(
        service.login({ email: 'u@test.com', password: 'correct' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('lanza UnauthorizedException si refresh token inválido', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.refresh({ refreshToken: 'bad-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si hash no coincide en BD', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        refreshTokenHash: 'stored-hash',
      });
      const argon2 = require('argon2');
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(
        service.refresh({ refreshToken: 'valid-jwt-but-wrong-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('invalida refresh en BD (updateMany con refreshTokenHash null)', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

      await service.logout({ refreshToken: 'valid-refresh' });

      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshTokenHash: null },
      });
    });
  });

  describe('resetPassword', () => {
    it('lanza BadRequest si token malformado', async () => {
      await expect(
        service.resetPassword('no-colon-token', 'NewPass123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('limpia resetTokenHash, resetTokenExpiresAt y refreshTokenHash al actualizar', async () => {
      const userId = 'user-reset-1';
      const rawToken = 'abc123';
      const token = `${userId}:${rawToken}`;
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: userId,
          resetTokenHash: 'hash',
          resetTokenExpiresAt: new Date(Date.now() + 3600000),
          status: UserStatus.ACTIVE,
        })
        .mockResolvedValueOnce(undefined);

      const argon2 = require('argon2');
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      jest.spyOn(argon2, 'hash').mockResolvedValue('new-password-hash');

      mockPrisma.user.update.mockResolvedValue({});

      await service.resetPassword(token, 'NewPass123!');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          passwordHash: 'new-password-hash',
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          refreshTokenHash: null,
        },
      });
    });
  });
});
