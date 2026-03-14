import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, User, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserQueryDto } from './dto/user-query.dto';

/**
 * Tipo de respuesta de usuario en API: Prisma User sin campos sensibles.
 * Type alias sobre User para mantener sincronía con el schema; no es DTO ni interfaz propia.
 */
export type UserResponse = Omit<
  User,
  'passwordHash' | 'refreshTokenHash' | 'resetTokenHash' | 'resetTokenExpiresAt'
>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toResponse(user: User): UserResponse {
    const { passwordHash, refreshTokenHash, resetTokenHash, resetTokenExpiresAt, ...rest } = user;
    return rest;
  }

  /**
   * Crea un usuario (hash de contraseña aquí). Reutilizado por:
   * - POST /users: creación administrativa (admin crea usuario con email + password).
   * - AuthService.register() en Fase 5: mismo método, mismo DTO; sin duplicar lógica.
   */
  async create(dto: CreateUserDto): Promise<UserResponse> {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName ?? '',
        lastName: dto.lastName ?? '',
        role: dto.role ?? Role.USER,
        status: dto.status ?? UserStatus.ACTIVE,
      },
    });
    return this.toResponse(user);
  }

  async findAll(query: UserQueryDto): Promise<{ data: UserResponse[]; total: number }> {
    const { status, page = 1, limit = 10 } = query;
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: data.map((u) => this.toResponse(u)), total };
  }

  async findOne(id: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (dto.email) {
      const normalizedEmail = this.normalizeEmail(dto.email);
      const currentEmail = this.normalizeEmail(user.email);
      if (normalizedEmail !== currentEmail) {
        const existing = await this.prisma.user.findFirst({
          where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        });
        if (existing) {
          throw new ConflictException('User with this email already exists');
        }
      }
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.email != null && { email: this.normalizeEmail(dto.email) }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.role != null && { role: dto.role }),
      },
    });
    return this.toResponse(updated);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status as UserStatus },
    });
    return this.toResponse(updated);
  }
}
