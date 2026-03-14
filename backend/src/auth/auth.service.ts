import {
  UnauthorizedException,
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserResponse, UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenPayload } from './interfaces/token-payload.interface';
import { MailService } from '../mail/mail.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private getAccessExpiration(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRATION') ?? '15m';
  }

  private getRefreshExpiration(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRATION') ?? '7d';
  }

  private resolveRefreshToken(
    dto: RefreshTokenDto | undefined,
    cookieToken?: string,
  ): string {
    const token = dto?.refreshToken ?? cookieToken;
    if (!token) {
      throw new BadRequestException('Refresh token is required');
    }
    return token;
  }

  private async generateTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshTokenHash: string;
  }> {
    const payloadAccess: TokenPayload = { sub: userId, type: 'access' };
    const payloadRefresh: TokenPayload = { sub: userId, type: 'refresh' };
    const accessToken = this.jwtService.sign(payloadAccess, {
      expiresIn: this.getAccessExpiration(),
    });
    const refreshToken = this.jwtService.sign(payloadRefresh, {
      expiresIn: this.getRefreshExpiration(),
    });
    const refreshTokenHash = await argon2.hash(refreshToken);
    return { accessToken, refreshToken, refreshTokenHash };
  }

  /**
   * Register: delega creación a UsersService.create() (mismo método que POST /users).
   * Solo se fija role=USER y status=ACTIVE; no hay lógica duplicada de creación.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const createDto: CreateUserDto = {
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: Role.USER,
      status: UserStatus.ACTIVE,
    };
    const user = await this.usersService.create(createDto);
    const { accessToken, refreshToken, refreshTokenHash } = await this.generateTokens(
      user.id,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });
    return { user, accessToken, refreshToken };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const { accessToken, refreshToken, refreshTokenHash } = await this.generateTokens(
      user.id,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });
    const userResponse = await this.usersService.findOne(user.id);
    return { user: userResponse, accessToken, refreshToken };
  }

  async refresh(dto: RefreshTokenDto, cookieToken?: string): Promise<AuthTokens> {
    const refreshTokenValue = this.resolveRefreshToken(dto, cookieToken);
    let payload: TokenPayload;
    try {
      payload = this.jwtService.verify<TokenPayload>(refreshTokenValue, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (user.status !== UserStatus.ACTIVE) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });
      throw new ForbiddenException('Account is not active');
    }
    const valid = await argon2.verify(user.refreshTokenHash, refreshTokenValue);
    if (!valid) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const { accessToken, refreshToken, refreshTokenHash } = await this.generateTokens(
      user.id,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });
    return { accessToken, refreshToken };
  }

  async logout(dto: RefreshTokenDto, cookieToken?: string): Promise<void> {
    const refreshToken = dto?.refreshToken ?? cookieToken;
    if (!refreshToken) return;
    let payload: TokenPayload;
    try {
      payload = this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
    } catch {
      return;
    }
    if (payload.type !== 'refresh') return;
    await this.prisma.user.updateMany({
      where: { id: payload.sub },
      data: { refreshTokenHash: null },
    });
  }

  async me(userId: string): Promise<UserResponse> {
    return this.usersService.findOne(userId);
  }

  /**
   * Forgot password: respuesta siempre 200 para no revelar si el email existe.
   * Si usuario existe y ACTIVE, genera token (solo hash en BD), expiración, y envía link por mail (mock).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: this.normalizeEmail(email), mode: 'insensitive' } },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      return;
    }
    const rawToken = randomBytes(32).toString('hex');
    const tokenWithUserId = `${user.id}:${rawToken}`;
    const resetTokenHash = await argon2.hash(tokenWithUserId);
    const expirationMinutes = this.config.get<number>('RESET_TOKEN_EXPIRATION_MINUTES') ?? 60;
    const resetTokenExpiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash, resetTokenExpiresAt },
    });
    const baseUrl = this.config.get<string>('RESET_PASSWORD_BASE_URL') ?? 'http://localhost:3000';
    const link = `${baseUrl}/reset-password?token=${encodeURIComponent(tokenWithUserId)}`;
    await this.mailService.sendPasswordReset(user.email, link);
  }

  /**
   * Reset password: valida token (hash + expiración), actualiza passwordHash con Argon2,
   * limpia resetTokenHash, resetTokenExpiresAt y refreshTokenHash.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const colonIndex = token.indexOf(':');
    if (colonIndex <= 0 || colonIndex >= token.length - 1) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const userId = token.slice(0, colonIndex);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }
    if (new Date() > user.resetTokenExpiresAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: null, resetTokenExpiresAt: null },
      });
      throw new BadRequestException('Invalid or expired reset token');
    }
    const valid = await argon2.verify(user.resetTokenHash, token);
    if (!valid) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        refreshTokenHash: null,
      },
    });
  }
}
